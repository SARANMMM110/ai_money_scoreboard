import type { EngineId } from '../lib/plans.js';

export interface EngineQueryResult {
  answerText: string;
  sources: string[];
  raw?: unknown;
  costUsd?: number;
  skipped?: boolean;
  skipReason?: string;
}

export interface BrandContext {
  name: string;
  aliases: string[];
  domain: string | null;
  category: string | null;
  description: string | null;
  competitors: { name: string; aliases: string[]; domain: string | null }[];
}

export interface AnalyzedResult {
  mentioned: boolean;
  cited: boolean;
  prominence: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sources: string[];
  competitorMentions: Record<string, boolean>;
  hallucinationFlags: string[];
}

export interface EngineScoreBreakdown {
  visibilityScore: number;
  citationRate: number;
  promptCount: number;
  mentionCount: number;
  citationCount: number;
}

export interface VisibilityMetrics {
  visibilityScore: number;
  citationRate: number;
  shareOfVoice: number;
  sentimentMix: { positive: number; neutral: number; negative: number };
  engineScores: Record<string, EngineScoreBreakdown>;
  citedDomains: { domain: string; count: number }[];
}

export interface GapRecommendation {
  domain: string;
  citationCount: number;
  brandHasPresence: boolean;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export const ENGINE_LABELS: Record<EngineId, string> = {
  perplexity: 'Perplexity',
  openai: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  google_ai_overview: 'Google AI Overview',
};

export const PROMPT_TAGS = ['category', 'comparison', 'reputation'] as const;
export type PromptTag = (typeof PROMPT_TAGS)[number];
