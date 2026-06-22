import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { BrandContext, PromptTag } from './types.js';

export interface GeneratedPrompt {
  text: string;
  tag: PromptTag;
}

const FALLBACK_TEMPLATES: { tag: PromptTag; template: (ctx: BrandContext, comp?: string) => string }[] = [
  { tag: 'category', template: (c) => `What are the best ${c.category ?? 'tools'} in 2025?` },
  { tag: 'category', template: (c) => `Top ${c.category ?? 'software'} recommendations for small businesses` },
  { tag: 'comparison', template: (c, comp) => `${c.name} vs ${comp ?? 'alternatives'} — which is better?` },
  { tag: 'comparison', template: (c) => `Best ${c.name} alternatives` },
  { tag: 'reputation', template: (c) => `Is ${c.name} any good? Honest review` },
  { tag: 'reputation', template: (c) => `${c.name} reviews — worth it?` },
];

function fallbackPrompts(brand: BrandContext, limit: number): GeneratedPrompt[] {
  const out: GeneratedPrompt[] = [];
  const comps = brand.competitors.map((c) => c.name);
  for (const t of FALLBACK_TEMPLATES) {
    if (out.length >= limit) break;
    const comp = comps[out.length % Math.max(1, comps.length)];
    out.push({ text: t.template(brand, comp), tag: t.tag });
  }
  return out.slice(0, limit);
}

export async function generatePromptLibrary(brand: BrandContext, limit = 12): Promise<GeneratedPrompt[]> {
  if (!config.anthropicApiKey) return fallbackPrompts(brand, limit);

  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const competitors = brand.competitors.map((c) => c.name).join(', ') || 'none listed';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Generate ${limit} realistic buyer-intent search prompts someone would ask an AI assistant about this brand/category.

Brand: ${brand.name}
Category: ${brand.category ?? 'general'}
Domain: ${brand.domain ?? 'unknown'}
Competitors: ${competitors}

Mix:
- category prompts ("best X tools")
- comparison prompts ("Brand vs Competitor", "Brand alternatives")
- reputation prompts ("is Brand good", reviews)

Return ONLY JSON array: [{"text":"...","tag":"category|comparison|reputation"}]`,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return fallbackPrompts(brand, limit);

    const parsed = JSON.parse(match[0]) as GeneratedPrompt[];
    return parsed
      .filter((p) => p.text && ['category', 'comparison', 'reputation'].includes(p.tag))
      .slice(0, limit);
  } catch (err) {
    console.warn('[PromptGen] LLM failed, using templates:', err);
    return fallbackPrompts(brand, limit);
  }
}
