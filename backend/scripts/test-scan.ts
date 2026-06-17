import { crawlWebsite } from '../src/scanner/crawler.js';
import { extractSignals } from '../src/scanner/extractor.js';
import { runAllAnalyzers } from '../src/scanner/analyzers.js';
import { buildScanResult } from '../src/scanner/scoring.js';

const url = process.argv[2] ?? 'https://example.com';

console.log(`\nScanning ${url}...\n`);

try {
  const crawl = await crawlWebsite(url);
  const signals = extractSignals(crawl);
  const categories = runAllAnalyzers(signals, crawl);
  const result = buildScanResult(categories, crawl.contentHash);

  console.log(`Overall Score: ${result.overallScore}/100 (${result.band})`);
  console.log(`Content hash: ${crawl.contentHash.slice(0, 16)}…`);
  console.log(`Used Playwright: ${crawl.mainPage.usedPlaywright}`);
  console.log('\nCategories:');
  for (const cat of result.categories) {
    console.log(`  ${cat.category}: ${cat.score}/${cat.maxScore}`);
  }
  console.log(`\nIssues found: ${result.issues.length}`);
  result.issues.slice(0, 5).forEach((i) => console.log(`  [${i.priority}] ${i.name}`));
  console.log('\n✓ Real scan completed successfully\n');
} catch (err) {
  console.error('Scan failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
