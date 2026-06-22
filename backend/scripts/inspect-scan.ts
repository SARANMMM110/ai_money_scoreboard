import { prisma } from '../src/lib/prisma.js';

const arg = process.argv[2] ?? '5dollarfriday.com';

const scan = await prisma.websiteScan.findFirst({
  where: arg.startsWith('cmq') ? { id: arg } : { url: { contains: arg.replace(/^https?:\/\//, '') } },
  orderBy: { scanDate: 'desc' },
  include: { issues: true, categories: true },
});

if (!scan) {
  console.log('Scan not found');
} else {
  console.log({
    id: scan.id,
    status: scan.status,
    score: scan.overallScore,
    contentHash: scan.contentHash,
    issueCount: scan.issues.length,
    categories: scan.categories.map((c) => `${c.category}:${c.score}`),
  });

  if (scan.contentHash) {
    const cache = await prisma.scanCache.findUnique({ where: { contentHash: scan.contentHash } });
    if (cache) {
      const r = cache.result as { issues?: unknown[]; overallScore?: number };
      console.log('Cache for this hash:', { issueCount: r.issues?.length ?? 0, score: r.overallScore });
    } else {
      console.log('No cache for this hash');
    }
  }
}

await prisma.$disconnect();
