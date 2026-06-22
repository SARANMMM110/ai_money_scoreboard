import { prisma } from '../src/lib/prisma.js';

const scanId = process.argv[2] ?? 'cmqpa7hbx0001bs58sytmrwb6';

async function main() {
  try {
    const scan = await prisma.websiteScan.findFirst({ where: { id: scanId } });
    console.log('scan found:', !!scan, scan?.status, scan?.scanMode);
  } catch (err) {
    console.error('QUERY FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
