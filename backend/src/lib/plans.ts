export type PlanId = 'free' | 'pro' | 'agency';

export interface PlanLimits {
  maxPrompts: number;
  maxEngines: number;
  runsPerMonth: number;
  maxCostPerRunUsd: number;
  scheduling: boolean;
  gapAnalysis: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxPrompts: 5,
    maxEngines: 1,
    runsPerMonth: 2,
    maxCostPerRunUsd: 0.5,
    scheduling: false,
    gapAnalysis: false,
  },
  pro: {
    maxPrompts: 20,
    maxEngines: 4,
    runsPerMonth: 30,
    maxCostPerRunUsd: 5,
    scheduling: true,
    gapAnalysis: true,
  },
  agency: {
    maxPrompts: 50,
    maxEngines: 5,
    runsPerMonth: 100,
    maxCostPerRunUsd: 25,
    scheduling: true,
    gapAnalysis: true,
  },
};

export const ENGINE_COST_USD: Record<string, number> = {
  perplexity: 0.005,
  openai: 0.01,
  claude: 0.01,
  gemini: 0.005,
  google_ai_overview: 0.02,
  copilot: 0,
};

export const ALL_ENGINES = [
  'perplexity',
  'openai',
  'claude',
  'gemini',
  'google_ai_overview',
] as const;

export type EngineId = (typeof ALL_ENGINES)[number];

export function resolvePlan(plan?: string | null): PlanId {
  if (plan === 'pro' || plan === 'agency') return plan;
  return 'free';
}

export function estimateRunCost(promptCount: number, engines: string[]): number {
  return promptCount * engines.reduce((sum, e) => sum + (ENGINE_COST_USD[e] ?? 0.01), 0);
}
