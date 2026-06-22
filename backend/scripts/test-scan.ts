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
  const result = buildScanResult(categories, crawl.contentHash, signals, crawl);

  console.log(`Overall Score: ${result.overallScore}/100 (${result.band})`);
  console.log(`Content hash: ${crawl.contentHash.slice(0, 16)}…`);
  console.log('\nCategories:');
  for (const cat of result.categories) {
    console.log(`  ${cat.category}: ${cat.score}/${cat.maxScore}`);
  }
  console.log(`\nIssues found: ${result.issues.length}`);
  const sample = result.issues[0];
  if (sample) {
    console.log(`\nSample fix (${sample.issueId}):`);
    console.log(`  Steps: ${sample.steps.length}`);
    console.log(`  Has code: ${!!sample.code}`);
    console.log(`  First step: ${sample.steps[0]?.slice(0, 80)}…`);
  }
  console.log('\n✓ Real scan with solution library completed\n');
} catch (err) {
  console.error('Scan failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
