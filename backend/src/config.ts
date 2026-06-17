import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/ai_money_scoreboard'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  storagePath: process.env.STORAGE_PATH ?? './storage',
  scanRateLimitWindowMs: parseInt(process.env.SCAN_RATE_LIMIT_WINDOW_MS ?? '3600000', 10),
  scanRateLimitMax: parseInt(process.env.SCAN_RATE_LIMIT_MAX ?? '10', 10),
};
