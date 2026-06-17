import { prisma } from '../lib/prisma.js';
import { crawlWebsite } from './crawler.js';
import { extractSignals } from './extractor.js';
import { runAllAnalyzers } from './analyzers.js';
import { buildScanResult } from './scoring.js';
import { enrichWithLLM, markQuickWins } from './llm.js';
import type { CategoryKey, ScanResult } from './types.js';
import { CATEGORIES, SCAN_STATUS_MESSAGES } from './types.js';

export interface ScanProgress {
  category: CategoryKey;
  status: 'pending' | 'running' | 'done';
  score?: number;
}

export async function getCachedResult(contentHash: string): Promise<ScanResult | null> {
  const cached = await prisma.scanCache.findUnique({ where: { contentHash } });
  if (!cached) return null;
  return cached.result as unknown as ScanResult;
}

export async function saveToCache(contentHash: string, result: ScanResult): Promise<void> {
  await prisma.scanCache.upsert({
    where: { contentHash },
    create: { contentHash, result: result as object },
    update: { result: result as object, cachedAt: new Date() },
  });
}

export async function runScanJob(scanId: string): Promise<void> {
  const scan = await prisma.websiteScan.findUnique({ where: { id: scanId } });
  if (!scan) return;

  const progress: ScanProgress[] = CATEGORIES.map((c) => ({
    category: c.key,
    status: 'pending',
  }));

  try {
    await prisma.websiteScan.update({
      where: { id: scanId },
      data: { status: 'running', progress: progress as object, error: null },
    });

    const crawl = await crawlWebsite(scan.url);

    const cached = await getCachedResult(crawl.contentHash);
    if (cached) {
      await persistScanResult(scanId, crawl.normalizedUrl, crawl.contentHash, cached, progress);
      return;
    }

    const signals = extractSignals(crawl);
    const categoryResults = runAllAnalyzers(signals, crawl);

    for (let i = 0; i < categoryResults.length; i++) {
      progress[i] = { category: categoryResults[i]!.category, status: 'running' };
      await prisma.websiteScan.update({
        where: { id: scanId },
        data: {
          progress: [
            ...progress.slice(0, i).map((p, idx) => ({ ...p, status: 'done' as const, score: categoryResults[idx]!.score })),
            progress[i],
            ...progress.slice(i + 1),
          ] as object,
        },
      });
      await sleep(300);
      progress[i] = { category: categoryResults[i]!.category, status: 'done', score: categoryResults[i]!.score };
    }

    let result = buildScanResult(categoryResults, crawl.contentHash);
    result.issues = markQuickWins(result.issues);
    result.issues = await enrichWithLLM(result.issues, signals, scan.url);

    await saveToCache(crawl.contentHash, result);
    await persistScanResult(scanId, crawl.normalizedUrl, crawl.contentHash, result, progress);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed unexpectedly';
    await prisma.websiteScan.update({
      where: { id: scanId },
      data: { status: 'failed', error: message, progress: progress as object },
    });
  }
}

async function persistScanResult(
  scanId: string,
  normalizedUrl: string,
  contentHash: string,
  result: ScanResult,
  progress: ScanProgress[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.categoryScore.deleteMany({ where: { scanId } });
    await tx.issue.deleteMany({ where: { scanId } });

    await tx.websiteScan.update({
      where: { id: scanId },
      data: {
        status: 'done',
        normalizedUrl,
        contentHash,
        overallScore: result.overallScore,
        band: result.band,
        progress: progress.map((p) => ({ ...p, status: 'done' })) as object,
        error: null,
      },
    });

    for (const cat of result.categories) {
      await tx.categoryScore.create({
        data: {
          scanId,
          category: cat.category,
          score: cat.score,
          maxScore: cat.maxScore,
          rawSignals: cat.rawSignals as object,
        },
      });
    }

    for (const issue of result.issues) {
      await tx.issue.create({
        data: {
          scanId,
          category: issue.category,
          name: issue.name,
          description: issue.description,
          impact: issue.impact,
          priority: issue.priority,
          isQuickWin: issue.isQuickWin,
          problem: issue.problem ?? null,
          reason: issue.reason ?? null,
          solution: issue.solution ?? null,
          expectedImpact: issue.expectedImpact ?? null,
          effort: issue.effort ?? null,
        },
      });
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCurrentCategoryMessage(progress: ScanProgress[] | null): string {
  if (!progress) return 'Initializing scan…';
  const running = progress.find((p) => p.status === 'running');
  if (running) return SCAN_STATUS_MESSAGES[running.category];
  const pending = progress.find((p) => p.status === 'pending');
  if (pending) return SCAN_STATUS_MESSAGES[pending.category];
  return 'Finalizing results…';
}
