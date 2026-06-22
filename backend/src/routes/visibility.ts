import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { estimateBrandRun, startVisibilityRun } from '../visibility/service.js';
import { upsertSchedule } from '../visibility/scheduler.js';

const router = Router();
router.use(authMiddleware);

router.get('/brands/:brandId/runs', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.brandId, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const runs = await prisma.visibilityRun.findMany({
    where: { brandId: brand.id },
    orderBy: { startedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      status: true,
      visibilityScore: true,
      citationRate: true,
      shareOfVoice: true,
      promptCount: true,
      enginesUsed: true,
      estimatedCost: true,
      actualCost: true,
      error: true,
    },
  });
  res.json({ runs });
});

router.get('/brands/:brandId/estimate', async (req, res) => {
  try {
    const estimate = await estimateBrandRun(req.params.brandId, req.user!.id);
    res.json(estimate);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Estimate failed' });
  }
});

router.post('/brands/:brandId/runs', async (req, res) => {
  try {
    const runId = await startVisibilityRun(req.params.brandId, req.user!.id);
    res.status(201).json({ runId });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not start run' });
  }
});

router.get('/runs/:runId', async (req, res) => {
  const run = await prisma.visibilityRun.findFirst({
    where: { id: req.params.runId, brand: { userId: req.user!.id } },
    include: {
      brand: { include: { competitors: true } },
      results: { include: { prompt: true }, orderBy: [{ engine: 'asc' }, { prompt: { text: 'asc' } }] },
    },
  });
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json({ run });
});

router.get('/runs/:runId/status', async (req, res) => {
  const run = await prisma.visibilityRun.findFirst({
    where: { id: req.params.runId, brand: { userId: req.user!.id } },
    select: {
      id: true,
      status: true,
      error: true,
      visibilityScore: true,
      citationRate: true,
      shareOfVoice: true,
      startedAt: true,
      completedAt: true,
    },
  });
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

router.put('/brands/:brandId/schedule', async (req, res) => {
  try {
    const schedule = await upsertSchedule(req.params.brandId, req.user!.id, {
      frequency: req.body.frequency === 'daily' ? 'daily' : 'weekly',
      enabled: req.body.enabled !== false,
      alertThreshold: req.body.alertThreshold,
    });
    res.json({ schedule });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Schedule failed' });
  }
});

router.get('/brands/:brandId/schedule', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.brandId, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const schedule = await prisma.visibilitySchedule.findUnique({ where: { brandId: brand.id } });
  res.json({ schedule });
});

export default router;
