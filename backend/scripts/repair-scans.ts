import { prisma } from '../src/lib/prisma.js';
import { reprocessScan } from '../src/scanner/service.js';

const broken = await prisma.websiteScan.findMany({
  where: { status: 'done', issues: { none: {} }, contentHash: { not: null } },
  select: { id: true, url: true },
});

console.log(`Reprocessing ${broken.length} scans with missing issues...`);

for (const scan of broken) {
  console.log(`Reprocessing ${scan.url}...`);
  await reprocessScan(scan.id);
  const count = await prisma.issue.count({ where: { scanId: scan.id } });
  console.log(`  → ${count} issues saved`);
}

await prisma.$disconnect();
