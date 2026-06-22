import { Sparkline } from './Sparkline';
import type { ScanSummary } from '../types';

function scoreSeries(scans: ScanSummary[]) {
  return scans
    .filter((s) => s.status === 'done' && s.overallScore != null)
    .slice(0, 12)
    .reverse()
    .map((s) => s.overallScore!);
}

export function ScoreTrends({ scans }: { scans: ScanSummary[] }) {
  const scores = scoreSeries(scans);
  if (scores.length < 2) return null;

  return (
    <div className="mt-4 pt-3 border-t border-line-soft">
      <p className="text-[10px] uppercase tracking-wider text-faint mb-2">Score trend</p>
      <Sparkline values={scores} color="var(--brand)" />
    </div>
  );
}
