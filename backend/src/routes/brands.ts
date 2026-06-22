import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { generatePromptLibrary } from '../visibility/prompt-generator.js';
import { ALL_ENGINES } from '../lib/plans.js';

const router = Router();
router.use(authMiddleware);

function parseAliases(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}

router.get('/meta/engines', (_req, res) => {
  res.json({ engines: ALL_ENGINES });
});

router.get('/', async (req, res) => {
  const brands = await prisma.brand.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      competitors: true,
      _count: { select: { prompts: true, runs: true } },
    },
  });
  res.json({ brands });
});

router.post('/', async (req, res) => {
  const { name, aliases, domain, category, description, enabledEngines, competitors } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Brand name is required' });

  const brand = await prisma.brand.create({
    data: {
      userId: req.user!.id,
      name: name.trim(),
      aliases: parseAliases(aliases),
      domain: domain?.trim() || null,
      category: category?.trim() || null,
      description: description?.trim() || null,
      enabledEngines: Array.isArray(enabledEngines) ? enabledEngines : ['perplexity'],
      competitors: {
        create: (competitors ?? []).map((c: { name: string; aliases?: string[]; domain?: string }) => ({
          name: c.name,
          aliases: parseAliases(c.aliases),
          domain: c.domain?.trim() || null,
        })),
      },
    },
    include: { competitors: true, prompts: true },
  });

  res.status(201).json({ brand });
});

router.get('/:id', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { competitors: true, prompts: { orderBy: { text: 'asc' } } },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json({ brand });
});

router.patch('/:id', async (req, res) => {
  const existing = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) return res.status(404).json({ error: 'Brand not found' });

  const { name, aliases, domain, category, description, enabledEngines } = req.body;
  const brand = await prisma.brand.update({
    where: { id: req.params.id },
    data: {
      ...(name != null && { name: String(name).trim() }),
      ...(aliases != null && { aliases: parseAliases(aliases) }),
      ...(domain !== undefined && { domain: domain?.trim() || null }),
      ...(category !== undefined && { category: category?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(enabledEngines != null && {
        enabledEngines: Array.isArray(enabledEngines) ? enabledEngines : parseAliases(existing.enabledEngines),
      }),
    },
    include: { competitors: true, prompts: true },
  });
  res.json({ brand });
});

router.delete('/:id', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  await prisma.brand.delete({ where: { id: req.params.id } });
  res.json({ message: 'Brand deleted' });
});

router.post('/:id/competitors', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const { name, aliases, domain } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Competitor name required' });

  const competitor = await prisma.competitor.create({
    data: {
      brandId: brand.id,
      name: name.trim(),
      aliases: parseAliases(aliases),
      domain: domain?.trim() || null,
    },
  });
  res.status(201).json({ competitor });
});

router.delete('/:id/competitors/:competitorId', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  await prisma.competitor.deleteMany({
    where: { id: req.params.competitorId, brandId: brand.id },
  });
  res.json({ message: 'Competitor removed' });
});

router.post('/:id/prompts', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const { text, tag, enabled } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Prompt text required' });
  if (!['category', 'comparison', 'reputation'].includes(tag)) {
    return res.status(400).json({ error: 'Tag must be category, comparison, or reputation' });
  }

  const prompt = await prisma.prompt.create({
    data: {
      brandId: brand.id,
      text: text.trim(),
      tag,
      enabled: enabled !== false,
    },
  });
  res.status(201).json({ prompt });
});

router.patch('/:id/prompts/:promptId', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const { text, tag, enabled } = req.body;
  const prompt = await prisma.prompt.updateMany({
    where: { id: req.params.promptId, brandId: brand.id },
    data: {
      ...(text != null && { text: String(text).trim() }),
      ...(tag != null && { tag }),
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
    },
  });
  if (prompt.count === 0) return res.status(404).json({ error: 'Prompt not found' });
  const updated = await prisma.prompt.findUnique({ where: { id: req.params.promptId } });
  res.json({ prompt: updated });
});

router.delete('/:id/prompts/:promptId', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  await prisma.prompt.deleteMany({
    where: { id: req.params.promptId, brandId: brand.id },
  });
  res.json({ message: 'Prompt deleted' });
});

router.post('/:id/prompts/generate', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { competitors: true },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const limit = Math.min(20, Math.max(3, parseInt(req.body.limit ?? '12', 10)));
  const generated = await generatePromptLibrary(
    {
      name: brand.name,
      aliases: parseAliases(brand.aliases),
      domain: brand.domain,
      category: brand.category,
      description: brand.description,
      competitors: brand.competitors.map((c) => ({
        name: c.name,
        aliases: parseAliases(c.aliases),
        domain: c.domain,
      })),
    },
    limit,
  );

  const replace = Boolean(req.body.replace);
  if (replace) {
    await prisma.prompt.deleteMany({ where: { brandId: brand.id } });
  }

  const prompts = await Promise.all(
    generated.map((p) =>
      prisma.prompt.create({
        data: { brandId: brand.id, text: p.text, tag: p.tag, enabled: true },
      }),
    ),
  );

  res.json({ prompts, generated: prompts.length });
});

router.get('/:id/entity', async (req, res) => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const { checkEntityPresence } = await import('../signals/entity-presence.js');
  const presence = await checkEntityPresence(brand.name, brand.domain, req.user!.id);
  res.json({ presence });
});

export default router;
