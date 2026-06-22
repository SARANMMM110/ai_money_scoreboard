import { prisma } from '../src/lib/prisma.js';

const hash = 'f0700f51ab03fac9b7811d616a5283b5c3078f57ead007fed8c268c5b12bdf00';
const cache = await prisma.scanCache.findUnique({ where: { contentHash: hash } });
if (!cache) {
  console.log('no cache');
} else {
  const r = cache.result as { issues?: Record<string, unknown>[]; overallScore?: number };
  const first = r.issues?.[0];
  console.log('issue count', r.issues?.length);
  console.log('first issue keys', first ? Object.keys(first) : null);
  console.log('has issueId', first && 'issueId' in first);
  console.log('has whyItMatters', first && 'whyItMatters' in first);
  console.log('has steps', first && 'steps' in first);
  console.log('sample steps', first?.steps);
}
await prisma.$disconnect();
