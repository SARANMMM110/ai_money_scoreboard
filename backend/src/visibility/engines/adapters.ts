import { config } from '../../config.js';
import { mapProviderError } from '../../vault/keyValidator.js';
import { scrubSecrets } from '../../vault/keyVault.js';
import type { EngineQueryResult } from '../types.js';

export type QueryEngineFn = (prompt: string, apiKey?: string) => Promise<EngineQueryResult>;

export type EngineCredentials = Partial<Record<'perplexity' | 'openai' | 'gemini' | 'google_ai_overview', string>>;

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)\]"']+/gi) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,;]+$/, '')))];
}

function providerHttpError(provider: string, status: number, body: string): Error {
  return new Error(mapProviderError(provider, status, scrubSecrets(body)));
}

export async function queryPerplexity(prompt: string, apiKey?: string): Promise<EngineQueryResult> {
  const key = apiKey ?? config.perplexityApiKey;
  if (!key) {
    return { answerText: '', sources: [], skipped: true, skipReason: 'No Perplexity API key' };
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw providerHttpError('perplexity', res.status, err);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    citations?: string[];
  };

  const answerText = data.choices?.[0]?.message?.content ?? '';
  const sources = [...new Set([...(data.citations ?? []), ...extractUrls(answerText)])];
  return { answerText, sources, costUsd: 0.005 };
}

export async function queryOpenAI(prompt: string, apiKey?: string): Promise<EngineQueryResult> {
  const key = apiKey ?? config.openaiApiKey;
  if (!key) {
    return { answerText: '', sources: [], skipped: true, skipReason: 'No OpenAI API key' };
  }

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: prompt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw providerHttpError('openai', res.status, err);
  }

  const data = (await res.json()) as {
    output?: { type: string; content?: { type: string; text?: string }[] }[];
    output_text?: string;
  };

  let answerText = data.output_text ?? '';
  const sources: string[] = [];

  for (const item of data.output ?? []) {
    if (item.type === 'message') {
      for (const block of item.content ?? []) {
        if (block.type === 'output_text' && block.text) answerText += block.text;
      }
    }
  }

  sources.push(...extractUrls(answerText));
  return { answerText: answerText.trim(), sources: [...new Set(sources)], costUsd: 0.01 };
}

export async function queryClaude(prompt: string, apiKey?: string): Promise<EngineQueryResult> {
  const key = apiKey ?? config.anthropicApiKey;
  if (!key) {
    return { answerText: '', sources: [], skipped: true, skipReason: 'No Claude API key' };
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw providerHttpError('claude', res.status, err);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string; citations?: { url?: string }[] }[];
  };

  let answerText = '';
  const sources: string[] = [];
  for (const block of data.content ?? []) {
    if (block.type === 'text' && block.text) answerText += block.text;
    for (const c of block.citations ?? []) {
      if (c.url) sources.push(c.url);
    }
  }

  sources.push(...extractUrls(answerText));
  return { answerText: answerText.trim(), sources: [...new Set(sources)], costUsd: 0.01 };
}

export async function queryGemini(prompt: string, apiKey?: string): Promise<EngineQueryResult> {
  const key = apiKey ?? config.googleAiApiKey;
  if (!key) {
    return { answerText: '', sources: [], skipped: true, skipReason: 'No Gemini API key' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw providerHttpError('gemini', res.status, err);
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      groundingMetadata?: { groundingChunks?: { web?: { uri?: string } }[] };
    }[];
  };

  const candidate = data.candidates?.[0];
  const answerText = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const sources = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c.web?.uri)
    .filter((u): u is string => Boolean(u));

  sources.push(...extractUrls(answerText));
  return { answerText: answerText.trim(), sources: [...new Set(sources)], costUsd: 0.005 };
}

/** Google AI Overview via SerpAPI — ToS-safe; do not scrape Google directly. */
export async function queryGoogleAiOverview(prompt: string, apiKey?: string): Promise<EngineQueryResult> {
  const key = apiKey ?? config.serpApiKey;
  if (!key) {
    return { answerText: '', sources: [], skipped: true, skipReason: 'No SerpAPI key' };
  }

  const params = new URLSearchParams({
    engine: 'google',
    q: prompt,
    api_key: key,
    google_domain: 'google.com',
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw providerHttpError('google_ai_overview', res.status, err);
  }

  const data = (await res.json()) as {
    ai_overview?: { text_blocks?: { snippet?: string }[]; references?: { link?: string }[] };
    answer_box?: { snippet?: string; link?: string };
  };

  const overview = data.ai_overview;
  const answerText =
    overview?.text_blocks?.map((b) => b.snippet ?? '').join('\n') ??
    data.answer_box?.snippet ??
    '';

  const sources = [
    ...(overview?.references?.map((r) => r.link).filter((l): l is string => Boolean(l)) ?? []),
    ...(data.answer_box?.link ? [data.answer_box.link] : []),
    ...extractUrls(answerText),
  ];

  return {
    answerText: answerText.trim(),
    sources: [...new Set(sources)],
    costUsd: 0.02,
    skipped: !answerText,
    skipReason: !answerText ? 'No AI Overview block returned for this query' : undefined,
  };
}
