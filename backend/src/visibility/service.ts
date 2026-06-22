import { prisma } from '../lib/prisma.js';
import { enqueueVisibilityRun } from '../lib/queue.js';
import {
  estimateRunCost,
  PLAN_LIMITS,
  resolvePlan,
  type EngineId,
} from '../lib/plans.js';
import { loadVisibilityCredentials } from '../vault/keyStore.js';
import { queryEngine, type EngineCredentials } from './engines/index.js';
import { analyzeAnswer, aggregateCitedDomains, enrichSentiment } from './analysis.js';
import { computeVisibilityMetrics } from './scoring.js';
import { buildGapRecommendations } from './gap-analysis.js';
import type { BrandContext } from './types.js';

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  return [];
}

function brandContext(brand: {
  name: string;
  aliases: unknown;
  domain: string | null;
  category: string | null;
  description: string | null;
  enabledEngines: unknown;
  competitors: { name: string; aliases: unknown; domain: string | null }[];
}): BrandContext & { enabledEngines: string[] } {
  return {
    name: brand.name,
    aliases: parseJsonArray(brand.aliases),
    domain: brand.domain,
    category: brand.category,
    description: brand.description,
    competitors: brand.competitors.map((c) => ({
      name: c.name,
      aliases: parseJsonArray(c.aliases),
      domain: c.domain,
    })),
    enabledEngines: parseJsonArray(brand.enabledEngines),
  };
}

export async function estimateBrandRun(brandId: string, userId: string) {
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId },
    include: { prompts: { where: { enabled: true } }, competitors: true },
  });
  if (!brand) throw new Error('Brand not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const plan = resolvePlan(user?.plan);
  const limits = PLAN_LIMITS[plan];
  const ctx = brandContext(brand);
  const prompts = brand.prompts.slice(0, limits.maxPrompts);
  const engines = ctx.enabledEngines.slice(0, limits.maxEngines);

  const estimatedCost = estimateRunCost(prompts.length, engines);
  const callCount = prompts.length * engines.length;

  return {
    plan,
    limits,
    promptCount: prompts.length,
    engines,
    callCount,
    estimatedCostUsd: Math.round(estimatedCost * 100) / 100,
    withinCostCap: estimatedCost <= limits.maxCostPerRunUsd,
  };
}

export async function startVisibilityRun(brandId: string, userId: string): Promise<string> {
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId },
    include: { prompts: { where: { enabled: true } }, competitors: true },
  });
  if (!brand) throw new Error('Brand not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const plan = resolvePlan(user?.plan);
  const limits = PLAN_LIMITS[plan];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const runsThisMonth = await prisma.visibilityRun.count({
    where: { brand: { userId }, startedAt: { gte: monthStart }, status: { not: 'failed' } },
  });
  if (runsThisMonth >= limits.runsPerMonth) {
    throw new Error(`Monthly run limit reached (${limits.runsPerMonth} on ${plan} plan)`);
  }

  const ctx = brandContext(brand);
  const prompts = brand.prompts.slice(0, limits.maxPrompts);
  const engines = ctx.enabledEngines.slice(0, limits.maxEngines) as EngineId[];

  if (prompts.length === 0) throw new Error('Add at least one enabled prompt before running');
  if (engines.length === 0) throw new Error('Enable at least one AI engine');

  const estimatedCost = estimateRunCost(prompts.length, engines);
  if (estimatedCost > limits.maxCostPerRunUsd) {
    throw new Error(
      `Estimated cost $${estimatedCost.toFixed(2)} exceeds plan cap $${limits.maxCostPerRunUsd.toFixed(2)}`,
    );
  }

  const run = await prisma.visibilityRun.create({
    data: {
      brandId,
      status: 'queued',
      promptCount: prompts.length,
      enginesUsed: engines,
      estimatedCost,
    },
  });

  await enqueueVisibilityRun(run.id);
  return run.id;
}

export async function runVisibilityJob(runId: string): Promise<void> {
  const run = await prisma.visibilityRun.findUnique({
    where: { id: runId },
    include: {
      brand: { include: { competitors: true, prompts: { where: { enabled: true } } } },
    },
  });
  if (!run) return;

  await prisma.visibilityRun.update({
    where: { id: runId },
    data: { status: 'running' },
  });

  const brand = run.brand;
  const ctx = brandContext(brand);
  const engines = parseJsonArray(run.enginesUsed);
  const prompts = brand.prompts;
  let actualCost = 0;

  const { credentials: rawCreds } = await loadVisibilityCredentials(brand.userId);
  const creds: EngineCredentials = {};
  for (const engine of engines) {
    if (rawCreds[engine]) creds[engine as keyof EngineCredentials] = rawCreds[engine];
  }

  try {
    for (const prompt of prompts) {
      for (const engine of engines) {
        const query = await queryEngine(engine, prompt.text, creds);
        if (query.skipped) {
          await prisma.promptEngineResult.create({
            data: {
              runId,
              promptId: prompt.id,
              engine,
              mentioned: false,
              cited: false,
              sources: [],
              answerText: query.skipReason ?? 'Engine skipped',
              raw: query.raw != null ? (query.raw as object) : undefined,
            },
          });
          continue;
        }

        actualCost += query.costUsd ?? 0;
        let analyzed = analyzeAnswer(query, ctx);
        const sentiment = await enrichSentiment(query.answerText, brand.name, analyzed.mentioned);
        analyzed = { ...analyzed, sentiment };

        await prisma.promptEngineResult.create({
          data: {
            runId,
            promptId: prompt.id,
            engine,
            mentioned: analyzed.mentioned,
            cited: analyzed.cited,
            prominence: analyzed.prominence,
            sentiment: analyzed.sentiment,
            sources: analyzed.sources,
            answerText: query.answerText,
            competitorMentions: analyzed.competitorMentions,
            hallucinationFlags: analyzed.hallucinationFlags,
            raw: query.raw != null ? (query.raw as object) : undefined,
          },
        });
      }
    }

    const results = await prisma.promptEngineResult.findMany({ where: { runId } });
    const metrics = computeVisibilityMetrics(
      results.map((r) => ({
        engine: r.engine,
        mentioned: r.mentioned,
        cited: r.cited,
        prominence: r.prominence,
        sentiment: r.sentiment,
        sources: parseJsonArray(r.sources),
        competitorMentions: r.competitorMentions as Record<string, boolean> | null,
      })),
      brand.name,
    );

    const citedDomains = aggregateCitedDomains(results.map((r) => ({ sources: parseJsonArray(r.sources) })));
    metrics.citedDomains = citedDomains;

    const user = await prisma.user.findUnique({ where: { id: brand.userId } });
    const plan = resolvePlan(user?.plan);
    const gapRecommendations =
      PLAN_LIMITS[plan].gapAnalysis ? buildGapRecommendations(citedDomains, ctx) : [];

    await prisma.visibilityRun.update({
      where: { id: runId },
      data: {
        status: 'done',
        completedAt: new Date(),
        visibilityScore: metrics.visibilityScore,
        citationRate: metrics.citationRate,
        shareOfVoice: metrics.shareOfVoice,
        sentimentMix: metrics.sentimentMix as object,
        engineScores: metrics.engineScores as object,
        citedDomains,
        gapRecommendations: gapRecommendations as object[],
        actualCost,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Visibility run failed';
    await prisma.visibilityRun.update({
      where: { id: runId },
      data: { status: 'failed', error: message, actualCost, completedAt: new Date() },
    });
  }
}
