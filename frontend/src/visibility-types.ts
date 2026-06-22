
export interface Brand {
  id: string;
  name: string;
  aliases: string[];
  domain: string | null;
  category: string | null;
  description: string | null;
  enabledEngines: string[];
  competitors: Competitor[];
  prompts?: Prompt[];
  createdAt?: string;
  updatedAt?: string;
  _count?: { prompts: number; runs: number };
}

export interface Competitor {
  id: string;
  brandId: string;
  name: string;
  aliases: string[];
  domain: string | null;
}

export interface Prompt {
  id: string;
  brandId: string;
  text: string;
  tag: 'category' | 'comparison' | 'reputation';
  enabled: boolean;
}

export interface VisibilityRunSummary {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  visibilityScore: number | null;
  citationRate: number | null;
  shareOfVoice: number | null;
  promptCount: number | null;
  enginesUsed: string[] | null;
  estimatedCost: number | null;
  actualCost: number | null;
  error: string | null;
}

export interface EngineScoreBreakdown {
  visibilityScore: number;
  citationRate: number;
  promptCount: number;
  mentionCount: number;
  citationCount: number;
}

export interface GapRecommendation {
  domain: string;
  citationCount: number;
  brandHasPresence: boolean;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export interface PromptEngineResult {
  id: string;
  runId: string;
  promptId: string;
  engine: string;
  mentioned: boolean;
  cited: boolean;
  prominence: number | null;
  sentiment: string | null;
  sources: string[];
  answerText: string;
  competitorMentions: Record<string, boolean> | null;
  prompt: Prompt;
}

export interface VisibilityRunDetail extends VisibilityRunSummary {
  sentimentMix: { positive: number; neutral: number; negative: number } | null;
  engineScores: Record<string, EngineScoreBreakdown> | null;
  citedDomains: { domain: string; count: number }[] | null;
  gapRecommendations: GapRecommendation[] | null;
  results: PromptEngineResult[];
  brand: Brand;
}

export interface RunEstimate {
  plan: string;
  limits: {
    maxPrompts: number;
    maxEngines: number;
    runsPerMonth: number;
    maxCostPerRunUsd: number;
  };
  promptCount: number;
  engines: string[];
  callCount: number;
  estimatedCostUsd: number;
  withinCostCap: boolean;
}

export const ENGINE_LABELS: Record<string, string> = {
  perplexity: 'Perplexity',
  openai: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  google_ai_overview: 'Google AI Overview',
};

export function getVisibilityColor(score: number): string {
  if (score >= 70) return 'var(--ready)';
  if (score >= 40) return 'var(--good)';
  if (score >= 20) return 'var(--caution)';
  return 'var(--critical)';
}
