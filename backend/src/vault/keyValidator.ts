import { scrubSecrets } from './keyVault.js';
import type { VaultProvider } from './keyStore.js';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

function fail(status: number, body: string): ValidationResult {
  if (status === 401 || status === 403) {
    return { valid: false, reason: 'Invalid API key — check the value and try again' };
  }
  if (status === 429) {
    return { valid: false, reason: 'Rate limited — wait a moment and validate again' };
  }
  if (status === 402 || body.toLowerCase().includes('quota') || body.toLowerCase().includes('billing')) {
    return { valid: false, reason: 'Account is out of quota or billing is required' };
  }
  return { valid: false, reason: `Provider returned error (${status})` };
}

export async function validateProviderKey(provider: VaultProvider, apiKey: string): Promise<ValidationResult> {
  try {
    switch (provider) {
      case 'perplexity':
        return validatePerplexity(apiKey);
      case 'openai':
        return validateOpenAI(apiKey);
      case 'gemini':
        return validateGemini(apiKey);
      case 'serpapi':
        return validateSerpApi(apiKey);
      case 'google_kg':
        return validateGoogleKg(apiKey);
      default:
        return { valid: false, reason: 'Unknown provider' };
    }
  } catch (err) {
    return { valid: false, reason: scrubSecrets(err instanceof Error ? err.message : 'Validation failed') };
  }
}

async function validatePerplexity(apiKey: string): Promise<ValidationResult> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    }),
  });
  if (res.ok) return { valid: true };
  const body = scrubSecrets(await res.text());
  return fail(res.status, body);
}

async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res.ok) return { valid: true };
  const body = scrubSecrets(await res.text());
  return fail(res.status, body);
}

async function validateGemini(apiKey: string): Promise<ValidationResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
  );
  if (res.ok) return { valid: true };
  const body = scrubSecrets(await res.text());
  return fail(res.status, body);
}

async function validateSerpApi(apiKey: string): Promise<ValidationResult> {
  const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`);
  if (res.ok) return { valid: true };
  const body = scrubSecrets(await res.text());
  return fail(res.status, body);
}

async function validateGoogleKg(apiKey: string): Promise<ValidationResult> {
  const res = await fetch(
    `https://kgsearch.googleapis.com/v1/entities:search?query=test&key=${encodeURIComponent(apiKey)}&limit=1`,
  );
  if (res.ok) return { valid: true };
  const body = scrubSecrets(await res.text());
  return fail(res.status, body);
}

/** Map provider HTTP errors to user-facing messages for Deep Scan runs. */
export function mapProviderError(provider: string, status: number, rawBody: string): string {
  const body = scrubSecrets(rawBody);
  const name = provider === 'google_ai_overview' ? 'SerpAPI' : provider.charAt(0).toUpperCase() + provider.slice(1);

  if (status === 429) return `Your ${name} account is rate-limited — try again shortly.`;
  if (status === 401 || status === 403) return `Your ${name} API key was rejected — re-validate it in Settings.`;
  if (status === 402 || body.toLowerCase().includes('quota') || body.toLowerCase().includes('insufficient')) {
    return `Your ${name} key is out of quota — check billing on your provider account.`;
  }
  return `Your ${name} request failed (${status}). Check your provider dashboard.`;
}
