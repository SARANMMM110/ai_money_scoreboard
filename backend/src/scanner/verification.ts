import type { CategoryResult } from './types.js';
import type { DeepEnrichment } from './enrich-signals.js';
import type { CrawlResult } from './types.js';

/** Deep-only post-analyzer adjustments — verified audit findings Flash never sees. */
export function applyVerifiedAdjustments(
  categories: CategoryResult[],
  deep: DeepEnrichment,
  crawl: CrawlResult,
): CategoryResult[] {
  return categories.map((cat) => {
    let score = cat.score;
    const rawSignals = { ...cat.rawSignals, verifiedAdjustments: [] as string[] };
    const notes = rawSignals.verifiedAdjustments as string[];

    if (cat.category === 'technical') {
      if (deep.blockedPaths > 0) {
        const penalty = Math.min(3, deep.blockedPaths);
        score = Math.max(0, score - penalty);
        notes.push(`-${penalty} blocked paths in robots.txt`);
      }
      if (deep.homepageBlockedByRobots) {
        score = Math.max(0, score - 2);
        notes.push('-2 homepage blocked by robots.txt');
      }
    }

    if (cat.category === 'content') {
      if (deep.pagesCrawled >= 3 && deep.thinPages / deep.pagesCrawled >= 0.5) {
        score = Math.max(0, score - 2);
        notes.push('-2 majority of crawled pages are thin');
      }
      if (deep.orphanPageCount >= 2) {
        score = Math.max(0, score - 1);
        notes.push('-1 multiple orphan pages');
      }
    }

    if (cat.category === 'schema' && deep.schemaParseErrors > 0) {
      score = Math.max(0, score - Math.min(2, deep.schemaParseErrors));
      notes.push(`-${Math.min(2, deep.schemaParseErrors)} invalid JSON-LD blocks site-wide`);
    }

    if (cat.category === 'eeat') {
      const crawledUrls = [crawl.normalizedUrl, ...crawl.internalPages.map((p) => p.url)].map((u) =>
        u.toLowerCase(),
      );
      const hasAboutUrl = crawledUrls.some((u) => u.includes('/about'));
      if (!hasAboutUrl && !cat.rawSignals.aboutPage) {
        score = Math.max(0, score - 1);
        notes.push('-1 no about page found in full crawl');
      }
    }

    return { ...cat, score, rawSignals };
  });
}
