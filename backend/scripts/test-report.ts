import fs from 'fs';
import path from 'path';

import { prisma } from '../src/lib/prisma.js';
import { config } from '../src/config.js';

const scanId = process.argv[2] ?? 'cmqjfcq360001bsqg3gljzbak';

const scan = await prisma.websiteScan.findUnique({
  where: { id: scanId },
  include: { report: true },
});

if (!scan) {
  console.error('Scan not found');
  process.exit(1);
}

console.log('Scan:', { id: scan.id, status: scan.status, userId: scan.userId, report: scan.report });

const base = 'http://localhost:3001/api';
const token = `dev:${scan.userId}`;

const genRes = await fetch(`${base}/scans/${scanId}/report`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});
const genBody = await genRes.json();
console.log('POST /report:', genRes.status, genBody);

if (!genRes.ok) {
  process.exit(1);
}

const dlRes = await fetch(`${base}/reports/${scanId}/download`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('GET /download:', dlRes.status, dlRes.headers.get('content-type'));

if (dlRes.ok) {
  const buf = Buffer.from(await dlRes.arrayBuffer());
  console.log('PDF bytes:', buf.length, 'starts with %PDF:', buf.slice(0, 4).toString());
}

const shareToken = genBody.shareToken as string;
const shareRes = await fetch(`${base}/reports/r/${shareToken}`);
console.log('GET /r/:token:', shareRes.status, shareRes.headers.get('content-type'));
if (shareRes.ok) {
  const html = await shareRes.text();
  console.log('Share HTML length:', html.length, 'has score:', html.includes(String(scan.overallScore)));
}

const pdfPath = path.resolve(config.storagePath, 'reports', `${scanId}.pdf`);
console.log('PDF on disk:', fs.existsSync(pdfPath), pdfPath);

await prisma.$disconnect();
