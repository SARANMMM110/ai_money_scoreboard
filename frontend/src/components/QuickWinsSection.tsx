import { motion } from 'framer-motion';
import { CATEGORIES } from '../types';
import type { Issue } from '../types';
import { IconArrowRight, IconSparkle } from './icons';

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  schema: { icon: '◈', label: 'Schema' },
  eeat: { icon: '◎', label: 'E-E-A-T' },
  faq: { icon: '?', label: 'FAQ' },
  content: { icon: '≡', label: 'Content' },
  technical: { icon: '⚙', label: 'Technical' },
  authority: { icon: '★', label: 'Authority' },
  ai_accessibility: { icon: '◇', label: 'AI Access' },
};

const EFFORT_STYLES: Record<string, { chip: string; accent: string }> = {
  low: { chip: 'bg-good-soft text-good border-good/20', accent: 'from-good/20' },
  medium: { chip: 'bg-caution-soft text-caution border-caution/20', accent: 'from-caution/20' },
  high: { chip: 'bg-critical-soft text-critical border-critical/20', accent: 'from-critical/20' },
};

function effortKey(effort: string): string {
  const e = effort.toLowerCase();
  if (e.includes('low')) return 'low';
  if (e.includes('high')) return 'high';
  return 'medium';
}

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? CATEGORY_META[key]?.label ?? key;
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = issue.issueId || issue.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface QuickWinsSectionProps {
  issues: Issue[];
  onSelect?: (id: string) => void;
}

export function QuickWinsSection({ issues, onSelect }: QuickWinsSectionProps) {
  const items = dedupeIssues(issues);
  if (!items.length) return null;

  const lowEffort = items.filter((i) => effortKey(i.effort) === 'low').length;

  return (
    <section className="mb-10">
      <div className="bg-surface border border-line rounded-3xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="relative px-6 sm:px-8 py-6 border-b border-line-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.06] via-transparent to-good/[0.04] pointer-events-none" />
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-brand/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-[0_8px_20px_rgba(14,169,141,0.3)] shrink-0">
                <IconSparkle size={22} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand mb-1.5">High-impact fixes</p>
                <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Quick wins</h2>
                <p className="text-sm text-dim mt-1">Ship these today for the fastest score improvement</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <StatChip label="Available" value={String(items.length)} tone="brand" />
              <StatChip label="Low effort" value={String(lowEffort)} tone="good" />
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((issue, i) => (
              <QuickWinCard key={issue.id} issue={issue} index={i} onSelect={onSelect} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'good' }) {
  const styles = {
    brand: 'bg-brand-soft text-brand border-brand/20',
    good: 'bg-good-soft text-good border-good/20',
  };
  return (
    <div className={`flex flex-col items-center min-w-[72px] px-4 py-2.5 rounded-2xl border ${styles[tone]}`}>
      <span className="font-mono text-lg font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">{label}</span>
    </div>
  );
}

function QuickWinCard({
  issue,
  index,
  onSelect,
}: {
  issue: Issue;
  index: number;
  onSelect?: (id: string) => void;
}) {
  const effort = effortKey(issue.effort);
  const effortStyle = EFFORT_STYLES[effort] ?? EFFORT_STYLES.medium;
  const cat = CATEGORY_META[issue.category] ?? { icon: '•', label: categoryLabel(issue.category) };
  const step = issue.steps[0] ?? issue.description;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onSelect?.(issue.id)}
      className="group relative flex flex-col text-left bg-surface border border-line rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:border-brand/35 hover:shadow-panel hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brand/30"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${effortStyle.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="font-mono text-[10px] font-bold text-faint tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-dim bg-surface-2 border border-line-soft px-2 py-0.5 rounded-md">
            <span style={{ color: 'var(--brand)' }}>{cat.icon}</span>
            {cat.label}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border ${effortStyle.chip}`}>
            {issue.effort}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-ink leading-snug mb-2 group-hover:text-brand transition-colors pr-2">
        {issue.name}
      </h3>

      <p className="text-xs text-dim leading-relaxed line-clamp-3 flex-1 mb-4">{step}</p>

      <div className="flex items-center justify-between pt-3 border-t border-line-soft mt-auto">
        <span className="text-[10px] text-faint">
          Impact: <span className="text-dim font-medium">{issue.expectedImpact}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand opacity-70 group-hover:opacity-100 transition-all group-hover:gap-2">
          View fix
          <IconArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.button>
  );
}
