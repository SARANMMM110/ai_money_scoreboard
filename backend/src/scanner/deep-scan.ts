import { prisma } from '../lib/prisma.js';

import { config } from '../config.js';

import { ENGINE_COST_USD } from '../lib/plans.js';

import { loadVisibilityCredentials, sanitizeError, userHasLlmKey } from '../vault/keyStore.js';

import { queryEngine, type EngineCredentials } from '../visibility/engines/index.js';

import { analyzeAnswer, aggregateCitedDomains, enrichSentiment } from '../visibility/analysis.js';

import { computeVisibilityMetrics } from '../visibility/scoring.js';

import { buildGapRecommendations } from '../visibility/gap-analysis.js';

import type { BrandContext } from '../visibility/types.js';



const DEEP_PROMPT_COUNT = 5;



export interface DeepScanPrompt {

  text: string;

  tag: string;

}



export interface DeepEngineProgress {

  engine: string;

  status: 'pending' | 'running' | 'done' | 'skipped' | 'failed';

  completed: number;

  total: number;

  error?: string;

}



export interface SkippedStage {

  stage: string;

  reason: string;

}



export function buildDeepScanPrompts(siteName: string, domain: string): DeepScanPrompt[] {

  const label = siteName || domain;

  return [

    { text: `What is ${label} and what do they offer?`, tag: 'category' },

    { text: `Best alternatives to ${label}`, tag: 'comparison' },

    { text: `Is ${label} any good? Honest review`, tag: 'reputation' },

    { text: `Who are the top companies in the ${label} space?`, tag: 'category' },

    { text: `${label} reviews — worth it?`, tag: 'reputation' },

  ].slice(0, DEEP_PROMPT_COUNT);

}



export function estimateDeepScanCost(engineCount: number, promptCount = DEEP_PROMPT_COUNT): number {

  const engines = ['perplexity', 'openai', 'gemini', 'google_ai_overview'];

  const perEngine = engines.slice(0, engineCount).reduce((s, e) => s + (ENGINE_COST_USD[e] ?? 0.01), 0);

  return Math.round(promptCount * perEngine * 100) / 100;

}



export async function estimateDeepScanForUser(userId: string) {

  const { validEngines, skippedEngines } = await loadVisibilityCredentials(userId);

  const estimatedCostUsd = validEngines.reduce(

    (sum, e) => sum + DEEP_PROMPT_COUNT * (ENGINE_COST_USD[e] ?? 0.01),

    0,

  );



  return {

    promptCount: DEEP_PROMPT_COUNT,

    validEngines,

    skippedEngines,

    estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,

    withinCostCap: estimatedCostUsd <= config.deepScanMaxCostUsd,

    costCapUsd: config.deepScanMaxCostUsd,

  };

}



async function updateDeepProgress(scanId: string, engines: DeepEngineProgress[]): Promise<void> {

  await prisma.websiteScan.update({

    where: { id: scanId },

    data: { deepProgress: engines as object },

  });

}



/** Measured Deep layer — visibility queries with graceful degradation and runtime cost cap. */

export async function runDeepScanEnrichment(scanId: string): Promise<void> {

  const scan = await prisma.websiteScan.findUnique({ where: { id: scanId } });

  if (!scan || scan.scanMode !== 'deep') return;



  const skippedStages: SkippedStage[] = [];

  const hasLlm = await userHasLlmKey(scan.userId);

  if (!hasLlm) {

    skippedStages.push({ stage: 'llm_phrasing', reason: 'No valid OpenAI/Gemini key — using library fix text' });

  }

  skippedStages.push({ stage: 'content_intelligence', reason: 'Not configured — embeddings/NER stage skipped' });



  await prisma.websiteScan.update({

    where: { id: scanId },

    data: { deepStatus: 'running', deepError: null, skippedStages: skippedStages as object },

  });



  try {

    const { credentials: rawCreds, validEngines, skippedEngines } = await loadVisibilityCredentials(scan.userId);



    for (const s of skippedEngines) {

      skippedStages.push({ stage: `visibility:${s.engine}`, reason: s.reason });

    }



    const engineProgress: DeepEngineProgress[] = validEngines.map((e) => ({

      engine: e,

      status: 'pending',

      completed: 0,

      total: DEEP_PROMPT_COUNT,

    }));

    await updateDeepProgress(scanId, engineProgress);



    if (validEngines.length === 0) {

      await prisma.websiteScan.update({

        where: { id: scanId },

        data: {

          deepStatus: 'done',

          deepVisibility: undefined,

          visibilityScore: null,

          skippedStages: skippedStages as object,

          deepError: null,

        },

      });

      return;

    }



    const creds: EngineCredentials = {};

    for (const engine of validEngines) {

      creds[engine as keyof EngineCredentials] = rawCreds[engine];

    }



    let domain = scan.normalizedUrl;

    try {

      domain = new URL(scan.normalizedUrl).hostname.replace(/^www\./, '');

    } catch {

      /* keep normalizedUrl */

    }



    const siteName = domain.split('.')[0] ?? domain;

    const prompts = buildDeepScanPrompts(siteName, domain);

    const brand: BrandContext = {

      name: siteName,

      aliases: [domain],

      domain,

      category: null,

      description: null,

      competitors: [],

    };



    const providerErrors: string[] = [];

    const resultRows: {

      prompt: string;

      tag: string;

      engine: string;

      mentioned: boolean;

      cited: boolean;

      prominence: number | null;

      sentiment: string | null;

      sources: string[];

      answerText: string;

      competitorMentions: Record<string, boolean>;

    }[] = [];



    let actualCost = 0;

    const costCap = config.deepScanMaxCostUsd;

    let costExceeded = false;



    for (const engine of validEngines) {

      const prog = engineProgress.find((p) => p.engine === engine)!;

      prog.status = 'running';

      await updateDeepProgress(scanId, engineProgress);



      for (const prompt of prompts) {

        if (costExceeded) break;



        try {

          const query = await queryEngine(engine, prompt.text, creds);

          if (query.skipped) {

            skippedStages.push({ stage: `visibility:${engine}`, reason: query.skipReason ?? 'Skipped' });

            continue;

          }

          actualCost += query.costUsd ?? 0;



          if (actualCost > costCap) {

            costExceeded = true;

            skippedStages.push({

              stage: 'visibility',

              reason: `Runtime cost $${actualCost.toFixed(2)} exceeded cap $${costCap.toFixed(2)}`,

            });

            break;

          }



          let analyzed = analyzeAnswer(query, brand);

          const sentiment = await enrichSentiment(query.answerText, brand.name, analyzed.mentioned);

          analyzed = { ...analyzed, sentiment };



          resultRows.push({

            prompt: prompt.text,

            tag: prompt.tag,

            engine,

            mentioned: analyzed.mentioned,

            cited: analyzed.cited,

            prominence: analyzed.prominence,

            sentiment: analyzed.sentiment,

            sources: analyzed.sources,

            answerText: query.answerText,

            competitorMentions: analyzed.competitorMentions,

          });



          prog.completed++;

          await updateDeepProgress(scanId, engineProgress);

        } catch (err) {

          const msg = sanitizeError(err);

          providerErrors.push(`${engine}: ${msg}`);

          prog.error = msg;

        }

      }



      prog.status = prog.completed > 0 ? 'done' : prog.error ? 'failed' : 'skipped';

      await updateDeepProgress(scanId, engineProgress);



      if (costExceeded) break;

    }



    if (resultRows.length === 0) {

      await prisma.websiteScan.update({

        where: { id: scanId },

        data: {

          deepStatus: 'done',

          deepVisibility: undefined,

          visibilityScore: null,

          skippedStages: skippedStages as object,

          deepError: providerErrors.length ? providerErrors.join('; ') : 'All visibility engines skipped or failed',

        },

      });

      return;

    }



    const metrics = computeVisibilityMetrics(

      resultRows.map((r) => ({

        engine: r.engine,

        mentioned: r.mentioned,

        cited: r.cited,

        prominence: r.prominence,

        sentiment: r.sentiment,

        sources: r.sources,

        competitorMentions: r.competitorMentions,

      })),

      brand.name,

    );



    const citedDomains = aggregateCitedDomains(resultRows.map((r) => ({ sources: r.sources })));

    metrics.citedDomains = citedDomains;



    const gapRecommendations = buildGapRecommendations(citedDomains, brand);



    const payload = {

      visibilityScore: metrics.visibilityScore,

      citationRate: metrics.citationRate,

      shareOfVoice: metrics.shareOfVoice,

      sentimentMix: metrics.sentimentMix,

      engineScores: metrics.engineScores,

      citedDomains,

      gapRecommendations,

      enginesRan: validEngines.filter((e) => engineProgress.find((p) => p.engine === e)?.completed),

      enginesSkipped: skippedEngines,

      providerErrors,

      results: resultRows,

      estimatedCostUsd: validEngines.reduce(

        (sum, e) => sum + DEEP_PROMPT_COUNT * (ENGINE_COST_USD[e] ?? 0.01),

        0,

      ),

      actualCostUsd: actualCost,

      measuredAt: new Date().toISOString(),

      label: 'Measured snapshot — results change over time',

    };



    await prisma.websiteScan.update({

      where: { id: scanId },

      data: {

        deepStatus: 'done',

        deepVisibility: payload as object,

        visibilityScore: Math.round(metrics.visibilityScore),

        skippedStages: skippedStages as object,

        deepError: providerErrors.length ? providerErrors.join('; ') : null,

      },

    });

  } catch (err) {

    await prisma.websiteScan.update({

      where: { id: scanId },

      data: {

        deepStatus: 'done',

        deepError: sanitizeError(err),

        skippedStages: skippedStages as object,

      },

    });

  }

}

