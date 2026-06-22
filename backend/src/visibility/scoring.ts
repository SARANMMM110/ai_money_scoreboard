import type { EngineScoreBreakdown, VisibilityMetrics } from './types.js';

interface ResultRow {
  engine: string;
  mentioned: boolean;
  cited: boolean;
  prominence: number | null;
  sentiment: string | null;
  sources: string[];
  competitorMentions: Record<string, boolean> | null;
}

export function computeVisibilityMetrics(
  results: ResultRow[],
  brandName: string,
): VisibilityMetrics {
  const byEngine = new Map<string, ResultRow[]>();
  for (const r of results) {
    const list = byEngine.get(r.engine) ?? [];
    list.push(r);
    byEngine.set(r.engine, list);
  }

  const engineScores: Record<string, EngineScoreBreakdown> = {};
  let totalMentions = 0;
  let totalCompetitorMentions = 0;
  const sentimentMix = { positive: 0, neutral: 0, negative: 0 };

  for (const [engine, rows] of byEngine) {
    const promptCount = rows.length;
    const mentionCount = rows.filter((r) => r.mentioned).length;
    const citationCount = rows.filter((r) => r.cited).length;
    const weightedMentions = rows.filter((r) => r.mentioned).reduce((sum, r) => {
      const weight = r.prominence != null && r.prominence < 200 ? 1.2 : 1;
      return sum + weight;
    }, 0);

    engineScores[engine] = {
      visibilityScore: promptCount ? Math.round((weightedMentions / promptCount) * 100) : 0,
      citationRate: promptCount ? Math.round((citationCount / promptCount) * 100) : 0,
      promptCount,
      mentionCount,
      citationCount,
    };

    totalMentions += mentionCount;
    for (const r of rows) {
      if (r.sentiment === 'positive') sentimentMix.positive++;
      else if (r.sentiment === 'negative') sentimentMix.negative++;
      else if (r.sentiment) sentimentMix.neutral++;
      for (const [name, hit] of Object.entries(r.competitorMentions ?? {})) {
        if (hit) totalCompetitorMentions++;
        void name;
      }
    }
  }

  const promptEngines = results.length;
  const overallMentions = results.filter((r) => r.mentioned).length;
  const overallCitations = results.filter((r) => r.cited).length;

  const visibilityScore = promptEngines
    ? Math.round((overallMentions / promptEngines) * 100)
    : 0;
  const citationRate = promptEngines
    ? Math.round((overallCitations / promptEngines) * 100)
    : 0;
  const shareDenom = totalMentions + totalCompetitorMentions;
  const shareOfVoice = shareDenom
    ? Math.round((totalMentions / shareDenom) * 100)
    : totalMentions > 0
      ? 100
      : 0;

  void brandName;

  return {
    visibilityScore,
    citationRate,
    shareOfVoice,
    sentimentMix,
    engineScores,
    citedDomains: [],
  };
}
