import type { CategoryResult, ScanResult, DetectedIssue } from './types.js';
import { getScoreBand } from './types.js';
import { buildScanContext, resolveAllIssues } from './solutions.js';
import type { ExtractedSignals } from './extractor.js';
import type { CrawlResult } from './types.js';

export function computeOverallScore(categories: CategoryResult[]): number {
  return categories.reduce((sum, c) => sum + c.score, 0);
}

export function buildScanResult(
  categories: CategoryResult[],
  contentHash: string,
  signals: ExtractedSignals,
  crawl: CrawlResult,
): ScanResult {
  const ctx = buildScanContext(signals, crawl);
  const allRaw = categories.flatMap((c) => c.issues);

  const resolved = resolveAllIssues(allRaw, ctx);
  const resolvedByCategory = new Map<string, DetectedIssue[]>();
  for (const issue of resolved) {
    const list = resolvedByCategory.get(issue.category) ?? [];
    list.push(issue);
    resolvedByCategory.set(issue.category, list);
  }

  const enrichedCategories = categories.map((c) => ({
    category: c.category,
    score: c.score,
    maxScore: c.maxScore,
    rawSignals: c.rawSignals,
    issues: resolvedByCategory.get(c.category) ?? [],
  }));

  const overallScore = computeOverallScore(categories);

  return {
    overallScore,
    band: getScoreBand(overallScore),
    categories: enrichedCategories,
    issues: resolved,
    contentHash,
  };
}
