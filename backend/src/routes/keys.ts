import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  VAULT_PROVIDERS,
  type VaultProvider,
  saveUserKey,
  listUserKeyMeta,
  deleteUserKey,
  userHasDeepScanAccess,
} from '../vault/keyStore.js';
import { validateProviderKey } from '../vault/keyValidator.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(authMiddleware);

function isProvider(p: string): p is VaultProvider {
  return (VAULT_PROVIDERS as readonly string[]).includes(p);
}

router.get('/', async (req, res) => {
  const keys = await listUserKeyMeta(req.user!.id);
  const deepScanEligible = await userHasDeepScanAccess(req.user!.id);
  res.json({ keys, deepScanEligible });
});

router.put('/:provider', async (req, res) => {
  const provider = req.params.provider;
  if (!isProvider(provider)) return res.status(400).json({ error: 'Unknown provider' });

  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    return res.status(400).json({ error: 'API key is required' });
  }

  const validation = await validateProviderKey(provider, apiKey.trim());
  const meta = await saveUserKey(req.user!.id, provider, apiKey.trim(), validation.valid);

  if (!validation.valid) {
    return res.status(400).json({
      ...meta,
      valid: false,
      reason: validation.reason ?? 'Key validation failed',
    });
  }

  res.json(meta);
});

router.post('/:provider/validate', async (req, res) => {
  const provider = req.params.provider;
  if (!isProvider(provider)) return res.status(400).json({ error: 'Unknown provider' });

  const row = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId: req.user!.id, provider } },
  });
  if (!row) return res.status(404).json({ error: 'No key stored for this provider' });

  const { decryptStoredKey } = await import('../vault/keyStore.js');
  const plaintext = await decryptStoredKey(req.user!.id, provider);
  if (!plaintext) {
    await prisma.apiKey.update({ where: { id: row.id }, data: { valid: false } });
    return res.json({ valid: false, reason: 'Key could not be decrypted — save it again' });
  }

  const validation = await validateProviderKey(provider, plaintext);
  await prisma.apiKey.update({
    where: { id: row.id },
    data: {
      valid: validation.valid,
      lastValidatedAt: validation.valid ? new Date() : row.lastValidatedAt,
    },
  });

  res.json({ valid: validation.valid, reason: validation.reason });
});

router.delete('/:provider', async (req, res) => {
  const provider = req.params.provider;
  if (!isProvider(provider)) return res.status(400).json({ error: 'Unknown provider' });

  await deleteUserKey(req.user!.id, provider);
  res.json({ message: 'Key removed' });
});

export default router;
