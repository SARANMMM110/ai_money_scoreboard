import { config } from '../config.js';
import type { AnalyzedResult, BrandContext, EngineQueryResult } from './types.js';

function normalizeHost(input: string): string {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`;
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input.replace(/^www\./, '').toLowerCase();
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionScore(text: string, terms: string[]): { found: boolean; position: number | null } {
  const lower = text.toLowerCase();
  let earliest: number | null = null;
  for (const term of terms) {
    if (!term.trim()) continue;
    const idx = lower.search(new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`));
    if (idx >= 0 && (earliest === null || idx < earliest)) earliest = idx;
  }
  return { found: earliest !== null, position: earliest };
}

function domainCited(sources: string[], domain: string | null): boolean {
  if (!domain) return false;
  const host = normalizeHost(domain);
  return sources.some((s) => normalizeHost(s).includes(host) || host.includes(normalizeHost(s)));
}

export function analyzeAnswer(
  query: EngineQueryResult,
  brand: BrandContext,
): AnalyzedResult {
  const brandTerms = [brand.name, ...brand.aliases].filter(Boolean);
  const mention = mentionScore(query.answerText, brandTerms);
  const cited = domainCited(query.sources, brand.domain);

  const competitorMentions: Record<string, boolean> = {};
  for (const comp of brand.competitors) {
    const terms = [comp.name, ...comp.aliases].filter(Boolean);
    competitorMentions[comp.name] = mentionScore(query.answerText, terms).found;
  }

  return {
    mentioned: mention.found,
    cited,
    prominence: mention.position,
    sentiment: null,
    sources: query.sources,
    competitorMentions,
    hallucinationFlags: [],
  };
}

export async function enrichSentiment(
  answerText: string,
  brandName: string,
  mentioned: boolean,
): Promise<'positive' | 'neutral' | 'negative' | null> {
  if (!mentioned || !answerText.trim() || !config.anthropicApiKey) return mentioned ? 'neutral' : null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32,
        messages: [
          {
            role: 'user',
            content: `Sentiment toward "${brandName}" in this AI answer. Reply ONLY: positive, neutral, or negative.\n\n${answerText.slice(0, 1500)}`,
          },
        ],
      }),
    });
    if (!res.ok) return 'neutral';
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = (data.content?.[0]?.text ?? 'neutral').toLowerCase();
    if (text.includes('positive')) return 'positive';
    if (text.includes('negative')) return 'negative';
    return 'neutral';
  } catch {
    return 'neutral';
  }
}

export function aggregateCitedDomains(
  results: { sources: string[] }[],
): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    for (const src of r.sources) {
      const host = normalizeHost(src);
      if (!host || host.length < 4) continue;
      counts.set(host, (counts.get(host) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}
