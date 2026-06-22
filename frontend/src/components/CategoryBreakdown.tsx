import { motion } from 'framer-motion';
import { getCategoryColor } from '../types';
import type { CategoryScore } from '../types';

const CATEGORY_META: Record<string, { icon: string; desc: string }> = {
  schema: { icon: '◈', desc: 'Structured data for AI parsers' },
  eeat: { icon: '◎', desc: 'Experience, expertise, authority, trust' },
  faq: { icon: '?', desc: 'Question-answer coverage' },
  content: { icon: '≡', desc: 'Depth and topical coverage' },
  technical: { icon: '⚙', desc: 'Crawlability and index signals' },
  authority: { icon: '★', desc: 'External trust and citations' },
  ai_accessibility: { icon: '◇', desc: 'Machine-readable content access' },
};

interface CategoryBreakdownProps {
  categories: CategoryScore[];
  topFinding: (category: string) => string;
}

export function CategoryBreakdown({ categories, topFinding }: CategoryBreakdownProps) {
  const sorted = [...categories].sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);
  const critical = sorted.filter((c) => c.score / c.maxScore < 0.3);
  const avgPct = Math.round(
    (categories.reduce((sum, c) => sum + c.score / c.maxScore, 0) / categories.length) * 100,
  );
  const passing = categories.filter((c) => c.score / c.maxScore >= 0.6).length;

  return (
    <section className="mb-10">
      <div className="bg-surface border border-line rounded-3xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="relative px-6 sm:px-8 py-6 border-b border-line-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.04] via-transparent to-purple/[0.03] pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand mb-2">Audit dimensions</p>
              <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Category breakdown</h2>
              <p className="text-sm text-dim mt-1">Seven dimensions that determine AI search readiness</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <SummaryChip label="Average" value={`${avgPct}%`} tone="brand" />
              <SummaryChip label="Critical" value={String(critical.length)} tone="critical" />
              <SummaryChip label="Passing" value={`${passing}/7`} tone="good" />
            </div>
          </div>
        </div>

        {/* Priority strip */}
        {critical.length > 0 && (
          <div className="px-6 sm:px-8 py-4 bg-gradient-to-r from-critical-soft/80 to-critical-soft/30 border-b border-critical/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-critical">Fix first</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {critical.map((c) => {
                  const pct = Math.round((c.score / c.maxScore) * 100);
                  return (
                    <span
                      key={c.category}
                      className="inline-flex items-center gap-2 text-xs bg-surface border border-critical/20 rounded-full pl-1 pr-3 py-1 shadow-sm"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: getCategoryColor(c.score, c.maxScore) }}
                      >
                        {pct}
                      </span>
                      <span className="text-ink font-medium">{c.label}</span>
                      <span className="text-faint font-mono">{c.score}/{c.maxScore}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Ranked category list */}
        <div className="divide-y divide-line-soft">
          {sorted.map((cat, i) => (
            <CategoryRow
              key={cat.category}
              categoryKey={cat.category}
              label={cat.label}
              score={cat.score}
              maxScore={cat.maxScore}
              finding={topFinding(cat.category)}
              rank={i + 1}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'critical' | 'good';
}) {
  const styles = {
    brand: 'bg-brand-soft text-brand border-brand/20',
    critical: 'bg-critical-soft text-critical border-critical/20',
    good: 'bg-good-soft text-good border-good/20',
  };

  return (
    <div className={`flex flex-col items-center min-w-[72px] px-4 py-2.5 rounded-2xl border ${styles[tone]}`}>
      <span className="font-mono text-lg font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">{label}</span>
    </div>
  );
}

function ScoreRing({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

function CategoryRow({
  categoryKey,
  label,
  score,
  maxScore,
  finding,
  rank,
  index,
}: {
  categoryKey: string;
  label: string;
  score: number;
  maxScore: number;
  finding?: string;
  rank: number;
  index: number;
}) {
  const color = getCategoryColor(score, maxScore);
  const pct = Math.round((score / maxScore) * 100);
  const meta = CATEGORY_META[categoryKey] ?? { icon: '•', desc: '' };
  const isCritical = pct < 30;
  const isGood = pct >= 60;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className={`group px-6 sm:px-8 py-5 transition-colors hover:bg-surface-2/50 ${
        isCritical ? 'bg-critical-soft/[0.15]' : ''
      }`}
    >
      <div className="flex items-center gap-4 sm:gap-5">
        {/* Rank */}
        <span className="hidden sm:flex w-6 text-[10px] font-mono font-bold text-faint tabular-nums shrink-0">
          {String(rank).padStart(2, '0')}
        </span>

        {/* Ring + score */}
        <div className="relative shrink-0">
          <ScoreRing pct={pct} color={color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <span className="font-mono text-xs font-bold tabular-nums leading-none" style={{ color }}>
              {pct}
            </span>
            <span className="text-[8px] text-faint uppercase">%</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  {meta.icon}
                </span>
                <h3 className="text-sm font-semibold text-ink">{label}</h3>
                {isCritical && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-critical bg-critical-soft px-2 py-0.5 rounded-md">
                    Critical
                  </span>
                )}
                {isGood && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-good bg-good-soft px-2 py-0.5 rounded-md">
                    Strong
                  </span>
                )}
              </div>
              <p className="text-xs text-faint mt-1 hidden sm:block">{meta.desc}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-lg font-bold tabular-nums leading-none" style={{ color }}>
                {score}
                <span className="text-sm text-faint font-normal">/{maxScore}</span>
              </p>
            </div>
          </div>

          {/* Progress track */}
          <div className="relative h-2 bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: index * 0.04 + 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Segment markers */}
            <div className="absolute inset-0 flex">
              {[25, 50, 75].map((mark) => (
                <div
                  key={mark}
                  className="absolute top-0 bottom-0 w-px bg-line/60"
                  style={{ left: `${mark}%` }}
                />
              ))}
            </div>
          </div>

          {finding && (
            <p className="text-xs text-dim mt-2.5 flex items-start gap-2">
              <span className="text-faint shrink-0">Top issue</span>
              <span className="font-medium text-ink/80 group-hover:text-brand transition-colors">{finding}</span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
