import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { CategoryResult, DetectedIssue } from './types.js';
import type { ExtractedSignals } from './extractor.js';

interface EnrichedIssue {
  name: string;
  problem: string;
  reason: string;
  solution: string;
  expectedImpact: string;
  effort: string;
}

export async function enrichWithLLM(
  issues: DetectedIssue[],
  signals: ExtractedSignals,
  url: string,
): Promise<DetectedIssue[]> {
  if (!config.anthropicApiKey || issues.length === 0) {
    return issues.map((issue) => ({
      ...issue,
      problem: issue.description,
      reason: issue.impact,
      solution: getDefaultSolution(issue),
      expectedImpact: issue.impact,
      effort: issue.isQuickWin ? 'Low' : issue.priority === 'high' ? 'Medium' : 'Low',
    }));
  }

  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const issueSummary = issues.slice(0, 15).map((i) => ({
      category: i.category,
      name: i.name,
      description: i.description,
      priority: i.priority,
    }));

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are an SEO expert writing recommendations for AI search readiness. 
URL: ${url}
Title: ${signals.title}
Word count: ${signals.wordCount}
Schema types: ${signals.jsonLdTypes.join(', ') || 'none'}

Issues detected:
${JSON.stringify(issueSummary, null, 2)}

For each issue, write plain-English recommendations. Return ONLY valid JSON array:
[{"name":"issue name","problem":"...","reason":"...","solution":"...","expectedImpact":"...","effort":"Low|Medium|High"}]

Do NOT change scores or add new issues. Match issue names exactly.`,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return applyDefaults(issues);

    const enriched: EnrichedIssue[] = JSON.parse(jsonMatch[0]);
    return issues.map((issue) => {
      const match = enriched.find((e) => e.name === issue.name);
      if (!match) return applyDefault(issue);
      return {
        ...issue,
        problem: match.problem,
        reason: match.reason,
        solution: match.solution,
        expectedImpact: match.expectedImpact,
        effort: match.effort,
      };
    });
  } catch (err) {
    console.warn('[LLM] Enrichment failed, using defaults:', err);
    return applyDefaults(issues);
  }
}

function getDefaultSolution(issue: DetectedIssue): string {
  const solutions: Record<string, string> = {
    'Missing schema markup': 'Add JSON-LD structured data for Organization and relevant content types.',
    'No FAQ schema': 'Implement FAQPage schema markup for your Q&A content.',
    'Missing contact info': 'Add a visible email address and phone number in the footer or contact page.',
    'No author attribution': 'Add author bylines with rel="author" links and Person schema.',
    'Thin content': 'Expand main content to at least 600 words with valuable, specific information.',
    'Meta description issue': 'Write a compelling meta description between 120–160 characters.',
    'Missing alt text': 'Add descriptive alt text to all meaningful images.',
    'JS-gated content': 'Ensure primary content renders in static HTML without JavaScript.',
    'No canonical tag': 'Add a canonical link tag pointing to the preferred URL.',
    'No social profiles': 'Add links to your official social media profiles.',
  };
  return solutions[issue.name] ?? `Address the ${issue.name.toLowerCase()} issue identified in the audit.`;
}

function applyDefault(issue: DetectedIssue): DetectedIssue {
  return {
    ...issue,
    problem: issue.description,
    reason: issue.impact,
    solution: getDefaultSolution(issue),
    expectedImpact: issue.impact,
    effort: issue.isQuickWin ? 'Low' : 'Medium',
  };
}

function applyDefaults(issues: DetectedIssue[]): DetectedIssue[] {
  return issues.map(applyDefault);
}

export function markQuickWins(issues: DetectedIssue[]): DetectedIssue[] {
  const quickWinNames = new Set([
    'Meta description issue',
    'Missing alt text',
    'No FAQ schema',
    'No author attribution',
    'No social profiles',
    'No canonical tag',
    'Missing schema markup',
    'No viewport meta',
  ]);
  return issues.map((i) => ({
    ...i,
    isQuickWin: i.isQuickWin || quickWinNames.has(i.name),
  }));
}
