import type { CategoryResult, ScanResult } from './types.js';
import { getScoreBand } from './types.js';

export function computeOverallScore(categories: CategoryResult[]): number {
  return categories.reduce((sum, c) => sum + c.score, 0);
}

export function buildScanResult(categories: CategoryResult[], contentHash: string): ScanResult {
  const overallScore = computeOverallScore(categories);
  const allIssues = categories.flatMap((c) => c.issues);

  return {
    overallScore,
    band: getScoreBand(overallScore),
    categories,
    issues: allIssues,
    contentHash,
  };
}
