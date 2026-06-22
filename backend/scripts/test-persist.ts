import { prisma } from '../src/lib/prisma.js';
import { crawlWebsite } from '../src/scanner/crawler.js';
import { extractSignals } from '../src/scanner/extractor.js';
import { runAllAnalyzers } from '../src/scanner/analyzers.js';
import { buildScanResult } from '../src/scanner/scoring.js';

const url = process.argv[2] ?? 'https://saravanans.vercel.app';

const user = await prisma.user.findFirst();
if (!user) throw new Error('No user in DB — register first');

console.log(`Testing full persist for ${url}...`);
const crawl = await crawlWebsite(url);
const signals = extractSignals(crawl);
const categories = runAllAnalyzers(signals, crawl);
const result = buildScanResult(categories, crawl.contentHash, signals, crawl);

const scan = await prisma.websiteScan.create({
  data: { userId: user.id, url, normalizedUrl: crawl.normalizedUrl, status: 'running' },
});

await prisma.categoryScore.deleteMany({ where: { scanId: scan.id } });
await prisma.issue.deleteMany({ where: { scanId: scan.id } });

await prisma.websiteScan.update({
  where: { id: scan.id },
  data: {
    status: 'done',
    normalizedUrl: crawl.normalizedUrl,
    contentHash: crawl.contentHash,
    overallScore: result.overallScore,
    band: result.band,
    error: null,
  },
});

await prisma.categoryScore.createMany({
  data: result.categories.map((cat) => ({
    scanId: scan.id,
    category: cat.category,
    score: cat.score,
    maxScore: cat.maxScore,
    rawSignals: cat.rawSignals as object,
  })),
});

await prisma.issue.createMany({
  data: result.issues.map((issue) => ({
    scanId: scan.id,
    issueId: issue.issueId,
    category: issue.category,
    name: issue.name,
    description: issue.description,
    priority: issue.priority,
    isQuickWin: issue.isQuickWin,
    whyItMatters: issue.whyItMatters,
    steps: issue.steps,
    code: issue.code ?? null,
    expectedImpact: issue.expectedImpact,
    effort: issue.effort,
  })),
});

const saved = await prisma.websiteScan.findUnique({
  where: { id: scan.id },
  include: { categories: true, issues: true },
});

console.log(`Score: ${saved?.overallScore} | categories: ${saved?.categories.length} | issues: ${saved?.issues.length}`);
console.log(`Sample: ${saved?.issues[0]?.name} — ${(saved?.issues[0]?.steps as string[])?.length} steps`);
console.log('Persist OK');
await prisma.$disconnect();
