import { prisma } from '../lib/prisma.js';
import { getVaultMasterKey } from '../config.js';
import {
  decryptKey,
  encryptKey,
  scrubSecrets,
  reencryptPayload,
  type EncryptedPayload,
} from './keyVault.js';

export const VAULT_PROVIDERS = [
  'perplexity',
  'openai',
  'gemini',
  'serpapi',
  'google_kg',
] as const;

export type VaultProvider = (typeof VAULT_PROVIDERS)[number];

/** Deep Scan visibility providers (google_kg is entity-only). */
export const DEEP_SCAN_PROVIDERS: VaultProvider[] = ['perplexity', 'openai', 'gemini', 'serpapi'];

const ENGINE_TO_PROVIDER: Record<string, VaultProvider> = {
  perplexity: 'perplexity',
  openai: 'openai',
  gemini: 'gemini',
  google_ai_overview: 'serpapi',
};

export function engineToProvider(engine: string): VaultProvider | null {
  return ENGINE_TO_PROVIDER[engine] ?? null;
}

export function providerLabel(provider: VaultProvider): string {
  const labels: Record<VaultProvider, string> = {
    perplexity: 'Perplexity',
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    serpapi: 'SerpAPI',
    google_kg: 'Google Knowledge Graph',
  };
  return labels[provider];
}

export async function saveUserKey(
  userId: string,
  provider: VaultProvider,
  plaintext: string,
  valid: boolean,
): Promise<{ provider: string; last4: string; valid: boolean; lastValidatedAt: Date | null }> {
  const master = getVaultMasterKey();
  const enc = encryptKey(plaintext.trim(), master);

  const row = await prisma.apiKey.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      authTag: enc.authTag,
      last4: enc.last4,
      valid,
      lastValidatedAt: valid ? new Date() : null,
    },
    update: {
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      authTag: enc.authTag,
      last4: enc.last4,
      valid,
      lastValidatedAt: valid ? new Date() : null,
    },
  });

  return {
    provider: row.provider,
    last4: row.last4,
    valid: row.valid,
    lastValidatedAt: row.lastValidatedAt,
  };
}

/** Server-only. Decrypted in memory for this call — never cache. Requires valid=true. */
export async function getDecryptedKey(userId: string, provider: VaultProvider): Promise<string | null> {
  const row = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!row || !row.valid) return null;

  try {
    const master = getVaultMasterKey();
    return decryptKey(row.ciphertext, row.iv, row.authTag, master);
  } catch {
    await prisma.apiKey.update({
      where: { id: row.id },
      data: { valid: false },
    });
    return null;
  }
}

/** Server-only decrypt for re-validation — ignores valid flag. */
export async function decryptStoredKey(userId: string, provider: VaultProvider): Promise<string | null> {
  const row = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!row) return null;
  try {
    const master = getVaultMasterKey();
    return decryptKey(row.ciphertext, row.iv, row.authTag, master);
  } catch {
    return null;
  }
}

export async function listUserKeyMeta(userId: string) {
  const rows = await prisma.apiKey.findMany({ where: { userId } });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return VAULT_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    if (!row) {
      return { provider, last4: null as string | null, valid: false, lastValidatedAt: null as Date | null };
    }
    return {
      provider,
      last4: row.last4,
      valid: row.valid,
      lastValidatedAt: row.lastValidatedAt,
    };
  });
}

export async function deleteUserKey(userId: string, provider: VaultProvider): Promise<void> {
  await prisma.apiKey.deleteMany({ where: { userId, provider } });
}

export async function userHasDeepScanAccess(userId: string): Promise<boolean> {
  const count = await prisma.apiKey.count({
    where: {
      userId,
      valid: true,
      provider: { in: DEEP_SCAN_PROVIDERS },
    },
  });
  return count > 0;
}

/** Valid OpenAI or Gemini key — used for Deep LLM-tailored fix phrasing only. */
export async function userHasLlmKey(userId: string): Promise<boolean> {
  const count = await prisma.apiKey.count({
    where: {
      userId,
      valid: true,
      provider: { in: ['openai', 'gemini'] },
    },
  });
  return count > 0;
}

export async function loadVisibilityCredentials(userId: string): Promise<{
  credentials: Record<string, string>;
  validEngines: string[];
  skippedEngines: { engine: string; reason: string }[];
}> {
  const credentials: Record<string, string> = {};
  const validEngines: string[] = [];
  const skippedEngines: { engine: string; reason: string }[] = [];

  const engines = ['perplexity', 'openai', 'gemini', 'google_ai_overview'] as const;
  for (const engine of engines) {
    const provider = engineToProvider(engine);
    if (!provider) continue;
    const key = await getDecryptedKey(userId, provider);
    if (key) {
      credentials[engine] = key;
      validEngines.push(engine);
    } else {
      const row = await prisma.apiKey.findUnique({
        where: { userId_provider: { userId, provider } },
      });
      skippedEngines.push({
        engine,
        reason: row
          ? row.valid
            ? 'Key could not be decrypted'
            : 'API key is invalid — re-validate in Settings'
          : 'No API key — add one in Settings',
      });
    }
  }

  return { credentials, validEngines, skippedEngines };
}

export async function reencryptAllUserKeys(oldSecret: string, newSecret: string): Promise<number> {
  const { parseMasterKey } = await import('./keyVault.js');
  const oldMaster = parseMasterKey(oldSecret);
  const newMaster = parseMasterKey(newSecret);
  const rows = await prisma.apiKey.findMany();
  let count = 0;

  for (const row of rows) {
    const rotated = reencryptPayload(
      { ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag },
      oldMaster,
      newMaster,
    );
    await prisma.apiKey.update({
      where: { id: row.id },
      data: {
        ciphertext: rotated.ciphertext,
        iv: rotated.iv,
        authTag: rotated.authTag,
      },
    });
    count++;
  }
  return count;
}

export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return scrubSecrets(msg);
}
