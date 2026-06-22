import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseMasterKey } from './vault/keyVault.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/src → repo root; backend/dist → repo root when built
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

let vaultMasterKey: Buffer | null = null;

export function getVaultMasterKey(): Buffer {
  if (!vaultMasterKey) {
    throw new Error('KEY_VAULT_SECRET not initialized');
  }
  return vaultMasterKey;
}

export function initVault(): void {
  const secret = process.env.KEY_VAULT_SECRET;
  if (!secret) {
    throw new Error(
      'KEY_VAULT_SECRET is required. Set a 32-byte key (hex/base64). In production, source from KMS — not a plain .env file.',
    );
  }
  vaultMasterKey = parseMasterKey(secret);
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/ai_money_scoreboard'),
  /** Platform fallbacks for local dev only — BYOK keys come from the user vault. */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  perplexityApiKey: process.env.PERPLEXITY_API_KEY ?? '',
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY ?? '',
  serpApiKey: process.env.SERPAPI_KEY ?? '',
  googleKgApiKey: process.env.GOOGLE_KG_API_KEY ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  storagePath: process.env.STORAGE_PATH ?? './storage',
  scanRateLimitWindowMs: parseInt(process.env.SCAN_RATE_LIMIT_WINDOW_MS ?? '3600000', 10),
  scanRateLimitMax: parseInt(process.env.SCAN_RATE_LIMIT_MAX ?? '10', 10),
  redisUrl: process.env.REDIS_URL ?? '',
  visibilityConcurrency: parseInt(process.env.VISIBILITY_CONCURRENCY ?? '2', 10),
  deepScanMaxCostUsd: parseFloat(process.env.DEEP_SCAN_MAX_COST_USD ?? '2'),
};
