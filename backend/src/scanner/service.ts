import { prisma } from '../lib/prisma.js';
import { crawlWebsite, SCAN_INTERNAL_PAGES } from './crawler.js';
import { extractSignals } from './extractor.js';
import { enrichSignals } from './enrich-signals.js';
import { runAllAnalyzers } from './analyzers.js';
import { buildScanResult } from './scoring.js';
import { buildDeepAudit } from './deep-audit.js';
import { applyVerifiedAdjustments } from './verification.js';
import type { CategoryKey, ScanResult } from './types.js';
import { CATEGORIES, SCAN_STATUS_MESSAGES } from './types.js';

export interface ScanProgress {
  category: CategoryKey;
  status: 'pending' | 'running' | 'done';
  score?: number;
}

const CACHE_PREFIX = 'scan:v4:';

function isValidCachedResult(result: unknown): result is ScanResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as ScanResult;
  if (!Array.isArray(r.issues) || !Array.isArray(r.categories)) return false;
  if (r.issues.length === 0) {
    if (typeof r.overallScore === 'number' && r.overallScore < 100) return false;
    return true;
  }
  return 'issueId' in r.issues[0]! && 'whyItMatters' in r.issues[0]! && 'steps' in r.issues[0]!;
}

function cacheKey(contentHash: string): string {
  return `${CACHE_PREFIX}${contentHash}`;
}

export async function getCachedResult(contentHash: string): Promise<ScanResult | null> {
  const key = cacheKey(contentHash);
  const cached = await prisma.scanCache.findUnique({ where: { contentHash: key } });
  if (!cached) return null;
  const result = cached.result as unknown;
  if (!isValidCachedResult(result)) {
    await prisma.scanCache.delete({ where: { contentHash: key } }).catch(() => {});
    return null;
  }
  return result;
}

export async function reprocessScan(scanId: string): Promise<void> {
  const scan = await prisma.websiteScan.findUnique({ where: { id: scanId } });
  if (!scan) return;
  if (scan.contentHash) {
    await prisma.scanCache.deleteMany({ where: { contentHash: cacheKey(scan.contentHash) } });
  }
  await runScanJob(scanId);
}

export async function repairScanIssues(scanId: string, contentHash: string): Promise<number> {
  const cached = await prisma.scanCache.findUnique({ where: { contentHash: cacheKey(contentHash) } });
  if (!cached) return 0;
  const result = cached.result as unknown;
  if (!isValidCachedResult(result) || result.issues.length === 0) return 0;

  await prisma.issue.deleteMany({ where: { scanId } });
  await prisma.issue.createMany({
    data: result.issues.map((issue) => ({
      scanId,
      issueId: issue.issueId,
      category: issue.category,
      name: issue.name,
      description: issue.description,
      priority: issue.priority,
      isQuickWin: issue.isQuickWin,
      whyItMatters: issue.whyItMatters,
      steps: issue.steps,
      code: issue.code ?? undefined,
      expectedImpact: issue.expectedImpact,
      effort: issue.effort,
    })),
  });
  return result.issues.length;
}

export async function saveToCache(contentHash: string, result: ScanResult): Promise<void> {
  const key = cacheKey(contentHash);
  await prisma.scanCache.upsert({
    where: { contentHash: key },
    create: { contentHash: key, result: result as object },
    update: { result: result as object, cachedAt: new Date() },
  });
}

async function runCategoryProgress(
  scanId: string,
  progress: ScanProgress[],
  categoryResults: ReturnType<typeof runAllAnalyzers>,
): Promise<void> {
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
}

/** Full-site readiness scan — crawl, validate signals, score, no external API calls. */
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
      data: {
        status: 'running',
        progress: progress as object,
        error: null,
        readinessDepth: 'verified',
      },
    });

    const crawl = await crawlWebsite(scan.url, { maxInternalPages: SCAN_INTERNAL_PAGES });
    const contentHash = crawl.contentHash;

    const cached = await getCachedResult(contentHash);
    if (cached) {
      await persistScanResult(scanId, crawl.normalizedUrl, contentHash, cached, progress);
      return;
    }

    const audit = buildDeepAudit(crawl);
    let signals = extractSignals(crawl, 'verified');
    signals = enrichSignals(signals, crawl, audit);

    let categoryResults = runAllAnalyzers(signals, crawl);
    if (signals.deep) {
      categoryResults = applyVerifiedAdjustments(categoryResults, signals.deep, crawl);
    }

    await runCategoryProgress(scanId, progress, categoryResults);

    const result = buildScanResult(categoryResults, contentHash, signals, crawl);

    await saveToCache(contentHash, result);
    await persistScanResult(scanId, crawl.normalizedUrl, contentHash, result, progress);
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
  await prisma.categoryScore.deleteMany({ where: { scanId } });
  await prisma.issue.deleteMany({ where: { scanId } });

  await prisma.websiteScan.update({
    where: { id: scanId },
    data: {
      status: 'done',
      normalizedUrl,
      contentHash,
      overallScore: result.overallScore,
      band: result.band,
      readinessDepth: 'verified',
      scanMode: 'scan',
      progress: progress.map((p) => ({ ...p, status: 'done' })) as object,
      error: null,
    },
  });

  if (result.categories.length > 0) {
    await prisma.categoryScore.createMany({
      data: result.categories.map((cat) => ({
        scanId,
        category: cat.category,
        score: cat.score,
        maxScore: cat.maxScore,
        rawSignals: cat.rawSignals as object,
      })),
    });
  }

  if (result.issues.length > 0) {
    await prisma.issue.createMany({
      data: result.issues.map((issue) => ({
        scanId,
        issueId: issue.issueId,
        category: issue.category,
        name: issue.name,
        description: issue.description,
        priority: issue.priority,
        isQuickWin: issue.isQuickWin,
        whyItMatters: issue.whyItMatters,
        steps: issue.steps,
        code: issue.code ?? undefined,
        expectedImpact: issue.expectedImpact,
        effort: issue.effort,
      })),
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCurrentCategoryMessage(progress: ScanProgress[] | null): string {
  if (!progress) return 'Initializing scan…';
  const running = progress.find((p) => p.status === 'running');
  if (running) {
    return SCAN_STATUS_MESSAGES[running.category as CategoryKey] ?? 'Analyzing your site…';
  }
  const pending = progress.find((p) => p.status === 'pending');
  if (pending) {
    return SCAN_STATUS_MESSAGES[pending.category as CategoryKey] ?? 'Analyzing your site…';
  }
  return 'Finalizing results…';
}
