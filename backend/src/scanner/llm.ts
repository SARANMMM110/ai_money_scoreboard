import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { DetectedIssue } from './types.js';
import type { ExtractedSignals } from './extractor.js';

/** Optional LLM pass — refines prose only; steps and code stay from the solution library. */
export async function phraseWithLLM(
  issues: DetectedIssue[],
  signals: ExtractedSignals,
  url: string,
): Promise<DetectedIssue[]> {
  if (!config.anthropicApiKey || issues.length === 0) return issues;

  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const summary = issues.slice(0, 12).map((i) => ({
      issueId: i.issueId,
      name: i.name,
      description: i.description,
      whyItMatters: i.whyItMatters,
      steps: i.steps,
    }));

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Tailor these AI-search audit recommendations to this specific site. URL: ${url}, Title: ${signals.title}, Platform hints: ${signals.jsonLdTypes.join(', ') || 'unknown'}.

${JSON.stringify(summary, null, 2)}

Return ONLY a JSON array with the same issueId values. You may refine description and whyItMatters prose to reference the site — do NOT change steps meaning, add/remove issues, or alter code. Format:
[{"issueId":"...","description":"...","whyItMatters":"..."}]`,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return issues;

    const phrased: { issueId: string; description?: string; whyItMatters?: string }[] = JSON.parse(jsonMatch[0]);
    return issues.map((issue) => {
      const match = phrased.find((p) => p.issueId === issue.issueId);
      if (!match) return issue;
      return {
        ...issue,
        description: match.description ?? issue.description,
        whyItMatters: match.whyItMatters ?? issue.whyItMatters,
      };
    });
  } catch (err) {
    console.warn('[LLM] Phrasing pass failed, using library text:', err);
    return issues;
  }
}
