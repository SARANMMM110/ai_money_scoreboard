import type { EngineId } from '../../lib/plans.js';
import type { EngineQueryResult } from '../types.js';
import {
  queryPerplexity,
  queryOpenAI,
  queryClaude,
  queryGemini,
  queryGoogleAiOverview,
  type EngineCredentials,
} from './adapters.js';

const ENGINE_IDS: EngineId[] = ['perplexity', 'openai', 'claude', 'gemini', 'google_ai_overview'];

export async function queryEngine(
  engine: string,
  prompt: string,
  credentials?: EngineCredentials,
): Promise<EngineQueryResult> {
  const key = credentials?.[engine as keyof EngineCredentials];
  switch (engine) {
    case 'perplexity':
      return queryPerplexity(prompt, key);
    case 'openai':
      return queryOpenAI(prompt, key);
    case 'claude':
      return queryClaude(prompt, key);
    case 'gemini':
      return queryGemini(prompt, key);
    case 'google_ai_overview':
      return queryGoogleAiOverview(prompt, key);
    default:
      return { answerText: '', sources: [], skipped: true, skipReason: `Unknown engine: ${engine}` };
  }
}

export function listVisibilityEngines(): EngineId[] {
  return ENGINE_IDS.filter((e) => e !== 'claude');
}

export { type EngineCredentials };
