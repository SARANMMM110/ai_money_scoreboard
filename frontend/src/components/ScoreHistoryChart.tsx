import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ScanSummary } from '../types';

export function ScoreHistoryChart({ scans }: { scans: ScanSummary[] }) {
  const data = scans
    .filter((s) => s.status === 'done' && s.overallScore != null)
    .slice(0, 10)
    .reverse()
    .map((s) => ({
      date: new Date(s.scanDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: s.overallScore!,
      url: s.url.replace(/^https?:\/\//, '').slice(0, 20),
    }));

  if (data.length < 2) return null;

  return (
    <div className="bg-surface border border-line rounded-xl p-5 mb-8">
      <h2 className="text-sm font-medium text-text-dim mb-4">Score trend</h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fill: '#5B6472', fontSize: 11 }} axisLine={{ stroke: '#2A303C' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#5B6472', fontSize: 11 }} axisLine={{ stroke: '#2A303C' }} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ background: '#14171F', border: '1px solid #2A303C', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#98A1B2' }}
              itemStyle={{ color: '#3DD4C0', fontFamily: 'JetBrains Mono' }}
            />
            <Line type="monotone" dataKey="score" stroke="#3DD4C0" strokeWidth={2} dot={{ fill: '#3DD4C0', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
