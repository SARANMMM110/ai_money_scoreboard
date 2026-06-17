import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { runScanJob, getCurrentCategoryMessage } from '../scanner/service.js';
import { checkUrlReachable } from '../scanner/crawler.js';
import { normalizeUrl } from '../scanner/utils.js';
import { config } from '../config.js';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { chromium } from 'playwright';
import { CATEGORY_LABELS } from '../scanner/types.js';

const router = Router();

const scanLimiter = rateLimit({
  windowMs: config.scanRateLimitWindowMs,
  max: config.scanRateLimitMax,
  message: { error: 'Scan rate limit exceeded. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authMiddleware);

router.post('/', scanLimiter, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const { valid, normalized, error } = normalizeUrl(url);
  if (!valid) return res.status(400).json({ error });

  const reachable = await checkUrlReachable(normalized);
  if (!reachable.reachable) {
    return res.status(400).json({ error: reachable.error ?? 'URL is not reachable' });
  }

  const scan = await prisma.websiteScan.create({
    data: {
      userId: req.user!.id,
      url,
      normalizedUrl: normalized,
      status: 'queued',
    },
  });

  setImmediate(() => runScanJob(scan.id));

  res.status(201).json({ scanId: scan.id });
});

router.get('/', async (req, res) => {
  const { search, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where = {
    userId: req.user!.id,
    ...(search
      ? { OR: [{ url: { contains: search as string, mode: 'insensitive' as const } }, { normalizedUrl: { contains: search as string, mode: 'insensitive' as const } }] }
      : {}),
  };

  const [scans, total] = await Promise.all([
    prisma.websiteScan.findMany({
      where,
      orderBy: { scanDate: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        url: true,
        normalizedUrl: true,
        status: true,
        overallScore: true,
        band: true,
        scanDate: true,
        error: true,
      },
    }),
    prisma.websiteScan.count({ where }),
  ]);

  res.json({ scans, total, page: pageNum, limit: limitNum });
});

router.get('/compare', async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'Both scan IDs required (a and b)' });

  const [scanA, scanB] = await Promise.all([
    prisma.websiteScan.findFirst({
      where: { id: a as string, userId: req.user!.id },
      include: { categories: true },
    }),
    prisma.websiteScan.findFirst({
      where: { id: b as string, userId: req.user!.id },
      include: { categories: true },
    }),
  ]);

  if (!scanA || !scanB) return res.status(404).json({ error: 'One or both scans not found' });
  if (scanA.status !== 'done' || scanB.status !== 'done') {
    return res.status(400).json({ error: 'Both scans must be completed' });
  }

  const deltas = scanA.categories.map((catA) => {
    const catB = scanB.categories.find((c) => c.category === catA.category);
    return {
      category: catA.category,
      label: CATEGORY_LABELS[catA.category as keyof typeof CATEGORY_LABELS],
      scoreA: catA.score,
      scoreB: catB?.score ?? 0,
      delta: catA.score - (catB?.score ?? 0),
      maxScore: catA.maxScore,
    };
  });

  res.json({
    scanA: { id: scanA.id, url: scanA.url, overallScore: scanA.overallScore, band: scanA.band, scanDate: scanA.scanDate },
    scanB: { id: scanB.id, url: scanB.url, overallScore: scanB.overallScore, band: scanB.band, scanDate: scanB.scanDate },
    overallDelta: (scanA.overallScore ?? 0) - (scanB.overallScore ?? 0),
    deltas,
  });
});

router.get('/:id/status', async (req, res) => {
  const scanId = String(req.params.id);
  const scan = await prisma.websiteScan.findFirst({
    where: { id: scanId, userId: req.user!.id },
  });
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  const progress = (scan.progress as { category: string; status: string; score?: number }[] | null) ?? [];

  res.json({
    status: scan.status,
    error: scan.error,
    progress,
    currentCategory: progress.find((p) => p.status === 'running')?.category ?? null,
    statusMessage: getCurrentCategoryMessage(progress as never),
    overallScore: scan.overallScore,
    band: scan.band,
  });
});

router.get('/:id', async (req, res) => {
  const scanId = String(req.params.id);
  const scan = await prisma.websiteScan.findFirst({
    where: { id: scanId, userId: req.user!.id },
    include: {
      categories: { orderBy: { category: 'asc' } },
      issues: { orderBy: [{ priority: 'asc' }, { name: 'asc' }] },
      report: true,
    },
  });
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  res.json({
    id: scan.id,
    url: scan.url,
    normalizedUrl: scan.normalizedUrl,
    status: scan.status,
    error: scan.error,
    overallScore: scan.overallScore,
    band: scan.band,
    scanDate: scan.scanDate,
    contentHash: scan.contentHash,
    categories: scan.categories.map((c) => ({
      category: c.category,
      label: CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS],
      score: c.score,
      maxScore: c.maxScore,
      rawSignals: c.rawSignals,
    })),
    issues: scan.issues,
    quickWins: scan.issues.filter((i) => i.isQuickWin),
    report: scan.report,
  });
});

router.post('/:id/rescan', scanLimiter, async (req, res) => {
  const scanId = String(req.params.id);
  const existing = await prisma.websiteScan.findFirst({
    where: { id: scanId, userId: req.user!.id },
  });
  if (!existing) return res.status(404).json({ error: 'Scan not found' });

  const scan = await prisma.websiteScan.create({
    data: {
      userId: req.user!.id,
      url: existing.url,
      normalizedUrl: existing.normalizedUrl,
      status: 'queued',
    },
  });

  setImmediate(() => runScanJob(scan.id));
  res.status(201).json({ scanId: scan.id });
});

router.delete('/:id', async (req, res) => {
  const scanId = String(req.params.id);
  const scan = await prisma.websiteScan.findFirst({
    where: { id: scanId, userId: req.user!.id },
  });
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  await prisma.websiteScan.delete({ where: { id: scan.id } });
  res.json({ message: 'Scan deleted' });
});

router.post('/:id/report', async (req, res) => {
  const scanId = String(req.params.id);
  const scan = await prisma.websiteScan.findFirst({
    where: { id: scanId, userId: req.user!.id },
    include: { categories: true, issues: true, report: true },
  });
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  if (scan.status !== 'done') return res.status(400).json({ error: 'Scan must be completed first' });

  if (scan.report?.pdfUrl) {
    return res.json({ pdfUrl: scan.report.pdfUrl, shareToken: scan.report.shareToken, reportId: scan.report.id });
  }

  const shareToken = randomBytes(16).toString('hex');
  const storageDir = path.resolve(config.storagePath, 'reports');
  await fs.mkdir(storageDir, { recursive: true });
  const pdfPath = path.join(storageDir, `${scanId}.pdf`);
  const pdfUrl = `/api/reports/${scanId}/download`;

  const html = buildReportHtml(scan);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
  } finally {
    await browser.close();
  }

  const report = await prisma.report.upsert({
    where: { scanId: scan.id },
    create: { scanId: scan.id, pdfUrl, shareToken },
    update: { pdfUrl, shareToken },
  });

  res.json({ pdfUrl, shareToken, reportId: report.id });
});

function buildReportHtml(scan: {
  url: string;
  overallScore: number | null;
  band: string | null;
  scanDate: Date;
  categories: { category: string; score: number; maxScore: number }[];
  issues: { name: string; description: string; priority: string; isQuickWin: boolean; solution: string | null; problem: string | null }[];
}): string {
  const quickWins = scan.issues.filter((i) => i.isQuickWin);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Inter, sans-serif; color: #14171F; line-height: 1.6; }
  h1 { color: #0C0E13; font-size: 28px; }
  h2 { color: #1FA893; font-size: 20px; margin-top: 32px; border-bottom: 1px solid #2A303C; padding-bottom: 8px; }
  .score { font-size: 64px; font-weight: bold; color: #3DD4C0; font-family: monospace; }
  .band { font-size: 18px; color: #5B6472; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #E5E7EB; }
  th { background: #F0F1F5; }
  .priority-high { color: #FF6B5B; }
  .priority-medium { color: #FFB454; }
  .priority-low { color: #5B6472; }
  .quick-win { background: #E8FBF8; padding: 12px; border-radius: 8px; margin: 8px 0; }
</style></head><body>
  <h1>AI Money Scoreboard Report</h1>
  <p><strong>URL:</strong> ${scan.url}</p>
  <p><strong>Date:</strong> ${scan.scanDate.toLocaleDateString()}</p>
  <div class="score">${scan.overallScore ?? '—'}</div>
  <div class="band">${scan.band ?? ''}</div>

  <h2>Executive Summary</h2>
  <p>This report audits how well AI search engines (ChatGPT Search, Google AI Overviews, Perplexity, Copilot, Gemini) can read, trust, and cite your website.</p>

  <h2>Category Scores</h2>
  <table>
    <tr><th>Category</th><th>Score</th></tr>
    ${scan.categories.map((c) => `<tr><td>${CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS]}</td><td>${c.score}/${c.maxScore}</td></tr>`).join('')}
  </table>

  <h2>Quick Wins</h2>
  ${quickWins.length ? quickWins.map((i) => `<div class="quick-win"><strong>${i.name}</strong><br>${i.solution ?? i.description}</div>`).join('') : '<p>No quick wins identified.</p>'}

  <h2>Issues & Recommendations</h2>
  ${scan.issues.map((i) => `<div style="margin-bottom:16px"><strong class="priority-${i.priority}">${i.name}</strong> (${i.priority})<br>${i.problem ?? i.description}<br><em>Solution:</em> ${i.solution ?? 'See documentation'}</div>`).join('')}
</body></html>`;
}

export default router;
