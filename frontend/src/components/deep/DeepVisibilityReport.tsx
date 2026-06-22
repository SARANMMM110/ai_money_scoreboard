import { useState } from 'react';
import type { DeepVisibilityData } from '../../types';
import { ENGINE_LABELS, getVisibilityColor } from '../../visibility-types';

export function DeepVisibilityReport({
  data,
  deepStatus,
  deepError,
}: {
  data: DeepVisibilityData | null | undefined;
  deepStatus?: string | null;
  deepError?: string | null;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (deepStatus === 'running' || deepStatus === 'pending') {
    return (
      <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse inline-block mr-2" />
        <p className="text-sm text-dim inline">Querying AI engines with your API keys…</p>
      </div>
    );
  }

  if (deepStatus === 'failed' && !data) {
    return (
      <div className="bg-critical-soft border border-critical/20 rounded-2xl p-6">
        <p className="font-semibold text-critical mb-1">AI Visibility report failed</p>
        <p className="text-sm text-dim">{deepError ?? 'Check your API keys in Settings'}</p>
      </div>
    );
  }

  if (!data) return null;

  const visColor = getVisibilityColor(data.visibilityScore ?? 0);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple mb-1">Deep Scan · Part 3</p>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">AI visibility report</h2>
        <p className="text-sm text-dim mt-2 max-w-2xl">
          Live queries to AI search engines using your API keys. This measures whether engines mention and cite your brand today — results change over time and are not part of Flash Scan.
        </p>
        <p className="text-xs text-faint mt-2">
          {data.label ?? 'Measured snapshot'} · {data.measuredAt ? new Date(data.measuredAt).toLocaleString() : ''}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Visibility score" value={`${data.visibilityScore}%`} color={visColor} />
        <MetricCard label="Citation rate" value={`${data.citationRate}%`} />
        <MetricCard label="Share of voice" value={`${data.shareOfVoice}%`} />
        <MetricCard label="Query cost" value={`$${(data.actualCostUsd ?? data.estimatedCostUsd ?? 0).toFixed(2)}`} />
      </div>

      {data.sentimentMix && (
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-semibold text-ink mb-3">Sentiment mix</h3>
          <div className="flex gap-6 text-sm">
            <span className="text-ready">Positive: {data.sentimentMix.positive}</span>
            <span className="text-dim">Neutral: {data.sentimentMix.neutral}</span>
            <span className="text-critical">Negative: {data.sentimentMix.negative}</span>
          </div>
        </div>
      )}

      {data.engineScores && (
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-semibold text-ink mb-4">Per-engine scores</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(data.engineScores).map(([engine, s]) => (
              <div key={engine} className="flex items-center justify-between bg-surface-2 rounded-xl px-4 py-3 border border-line-soft">
                <span className="text-sm font-medium text-ink">{ENGINE_LABELS[engine] ?? engine}</span>
                <div className="text-right">
                  <p className="font-mono font-bold text-brand">{s.visibilityScore}% vis</p>
                  <p className="text-xs text-faint">{s.citationRate}% cited · {s.promptCount} prompts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="font-display font-semibold text-ink">Prompt-by-prompt results</h3>
          <p className="text-xs text-dim mt-1">Every query sent to each engine — expand to read full AI answers</p>
        </div>
        <div className="divide-y divide-line-soft">
          {data.results.map((r, i) => (
            <div key={`${r.engine}-${r.prompt}-${i}`} className="px-5 py-4">
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-soft text-purple px-2 py-0.5 rounded-md">
                  {ENGINE_LABELS[r.engine] ?? r.engine}
                </span>
                {r.mentioned && <Badge ok>Mentioned</Badge>}
                {!r.mentioned && <Badge>Mentioned</Badge>}
                {r.cited && <Badge ok>Cited</Badge>}
                {!r.cited && <Badge>Cited</Badge>}
                {r.sentiment && <span className="text-xs text-faint capitalize">{r.sentiment}</span>}
              </div>
              <p className="text-sm font-medium text-ink mb-2">&ldquo;{r.prompt}&rdquo;</p>
              {r.sources.length > 0 && (
                <p className="text-xs text-faint mb-2">
                  Sources: {r.sources.slice(0, 5).join(', ')}{r.sources.length > 5 ? '…' : ''}
                </p>
              )}
              <button
                type="button"
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="text-xs text-brand font-semibold hover:underline"
              >
                {expanded === i ? 'Hide answer' : 'Show full answer'}
              </button>
              {expanded === i && (
                <pre className="mt-3 text-xs font-mono text-dim bg-surface-2 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {r.answerText}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.citedDomains && data.citedDomains.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-semibold text-ink mb-3">Most cited domains in AI answers</h3>
          <div className="flex flex-wrap gap-2">
            {data.citedDomains.slice(0, 15).map((d) => (
              <span key={d.domain} className="text-xs bg-surface-2 border border-line rounded-lg px-3 py-1.5 font-mono">
                {d.domain} <span className="text-brand font-bold">×{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.gapRecommendations && data.gapRecommendations.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-semibold text-ink mb-3">Gap recommendations</h3>
          <ul className="space-y-3">
            {data.gapRecommendations.map((g) => (
              <li key={g.domain} className="flex gap-3 text-sm">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 h-fit ${
                  g.priority === 'high' ? 'bg-critical-soft text-critical' : g.priority === 'medium' ? 'bg-caution-soft text-caution' : 'bg-surface-2 text-dim'
                }`}>
                  {g.priority}
                </span>
                <div>
                  <p className="font-semibold text-ink">{g.domain}</p>
                  <p className="text-dim text-xs mt-0.5">{g.action}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-faint space-y-1">
        {data.enginesRan?.length > 0 && (
          <p>Engines used: {data.enginesRan.map((e) => ENGINE_LABELS[e] ?? e).join(', ')}</p>
        )}
        {data.enginesSkipped?.map((s) => (
          <p key={s.engine}>Skipped {ENGINE_LABELS[s.engine] ?? s.engine}: {s.reason}</p>
        ))}
        {data.providerErrors?.map((e, idx) => (
          <p key={idx} className="text-caution">{e}</p>
        ))}
      </div>
    </section>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4 shadow-card">
      <p className="text-[10px] text-faint uppercase tracking-wider">{label}</p>
      <p className="font-display text-3xl font-bold mt-1" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

function Badge({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${ok ? 'bg-ready-soft text-ready' : 'bg-surface-2 text-faint line-through'}`}>
      {children}
    </span>
  );
}
