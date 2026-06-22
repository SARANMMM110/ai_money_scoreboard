import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES } from '../types';
import type { Issue } from '../types';
import { IconSparkle, IconTarget } from './icons';

type FilterKey = 'all' | 'high' | 'medium' | 'low' | 'quick';

const PRIORITY_META = {
  high: {
    label: 'High',
    badge: 'bg-critical-soft text-critical border-critical/25',
    stripe: 'bg-critical',
    ring: 'ring-critical/15',
    dot: 'bg-critical',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-caution-soft text-caution border-caution/25',
    stripe: 'bg-caution',
    ring: 'ring-caution/15',
    dot: 'bg-caution',
  },
  low: {
    label: 'Low',
    badge: 'bg-surface-2 text-dim border-line',
    stripe: 'bg-faint',
    ring: 'ring-line',
    dot: 'bg-faint',
  },
} as const;

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  schema: { icon: '◈', label: 'Schema' },
  eeat: { icon: '◎', label: 'E-E-A-T' },
  faq: { icon: '?', label: 'FAQ' },
  content: { icon: '≡', label: 'Content' },
  technical: { icon: '⚙', label: 'Technical' },
  authority: { icon: '★', label: 'Authority' },
  ai_accessibility: { icon: '◇', label: 'AI Access' },
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? CATEGORY_META[key]?.label ?? key;
}

interface IssuesSectionProps {
  issues: Issue[];
  expandId?: string | null;
}

export function IssuesSection({ issues, expandId }: IssuesSectionProps) {
  const [open, setOpen] = useState<string | null>(expandId ?? null);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (expandId) setOpen(expandId);
  }, [expandId]);

  const counts = useMemo(
    () => ({
      all: issues.length,
      high: issues.filter((i) => i.priority === 'high').length,
      medium: issues.filter((i) => i.priority === 'medium').length,
      low: issues.filter((i) => i.priority === 'low').length,
      quick: issues.filter((i) => i.isQuickWin).length,
    }),
    [issues],
  );

  const filtered = useMemo(() => {
    let list = [...issues];
    if (filter === 'quick') list = list.filter((i) => i.isQuickWin);
    else if (filter !== 'all') list = list.filter((i) => i.priority === filter);
    return list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [issues, filter]);

  if (!issues.length) {
    return (
      <section className="mb-10">
        <div className="bg-good-soft border border-good/20 rounded-3xl p-10 text-center">
          <p className="text-good font-semibold">No issues detected</p>
          <p className="text-dim text-sm mt-1">Your site is well-positioned for AI search citation.</p>
        </div>
      </section>
    );
  }

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'high', label: 'High', count: counts.high },
    { key: 'medium', label: 'Medium', count: counts.medium },
    { key: 'low', label: 'Low', count: counts.low },
    { key: 'quick', label: 'Quick wins', count: counts.quick },
  ];

  return (
    <section className="mb-10">
      <div className="bg-surface border border-line rounded-3xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="relative px-6 sm:px-8 py-6 border-b border-line-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/[0.04] via-transparent to-critical/[0.03] pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-soft flex items-center justify-center text-purple shrink-0">
                <IconTarget size={22} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple mb-1.5">Remediation guide</p>
                <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Issues &amp; how to fix them</h2>
                <p className="text-sm text-dim mt-1">Step-by-step fixes ranked by priority</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <StatChip label="Total" value={String(counts.all)} tone="neutral" />
              <StatChip label="High" value={String(counts.high)} tone="critical" />
              <StatChip label="Quick wins" value={String(counts.quick)} tone="brand" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 sm:px-8 py-4 border-b border-line-soft bg-surface-2/30 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl border transition-all ${
                filter === f.key
                  ? 'bg-ink text-white border-ink shadow-sm'
                  : 'bg-surface text-dim border-line hover:border-brand/30 hover:text-ink'
              }`}
            >
              {f.label}
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md tabular-nums ${
                  filter === f.key ? 'bg-white/15 text-white' : 'bg-surface-2 text-faint'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Issue list */}
        <div className="divide-y divide-line-soft">
          {filtered.length === 0 ? (
            <div className="px-6 sm:px-8 py-12 text-center text-sm text-dim">No issues match this filter.</div>
          ) : (
            filtered.map((issue, i) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                index={i}
                isOpen={open === issue.id}
                onToggle={() => setOpen(open === issue.id ? null : issue.id)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'critical' | 'brand';
}) {
  const styles = {
    neutral: 'bg-surface-2 text-ink border-line',
    critical: 'bg-critical-soft text-critical border-critical/20',
    brand: 'bg-brand-soft text-brand border-brand/20',
  };
  return (
    <div className={`flex flex-col items-center min-w-[72px] px-4 py-2.5 rounded-2xl border ${styles[tone]}`}>
      <span className="font-mono text-lg font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{label}</span>
    </div>
  );
}

function IssueRow({
  issue,
  index,
  isOpen,
  onToggle,
}: {
  issue: Issue;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const meta = PRIORITY_META[issue.priority];
  const cat = CATEGORY_META[issue.category] ?? { icon: '•', label: categoryLabel(issue.category) };

  return (
    <motion.div
      id={`issue-${issue.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`transition-colors ${isOpen ? `bg-surface-2/40 ring-inset ${meta.ring}` : 'hover:bg-surface-2/25'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-6 sm:px-8 py-5 flex items-start gap-4 sm:gap-5"
      >
        <span className="hidden sm:block font-mono text-[10px] font-bold text-faint tabular-nums w-6 shrink-0 pt-1">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className={`w-1 self-stretch rounded-full shrink-0 ${meta.stripe}`} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${meta.badge}`}>
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-dim bg-surface border border-line-soft px-2 py-0.5 rounded-md">
              <span className="text-brand">{cat.icon}</span>
              {cat.label}
            </span>
            {issue.isQuickWin && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand bg-brand-soft px-2 py-0.5 rounded-md">
                <IconSparkle size={10} />
                Quick win
              </span>
            )}
          </div>

          <h4 className="text-sm sm:text-base font-semibold text-ink leading-snug pr-4">{issue.name}</h4>
          <p className="text-sm text-dim mt-1.5 leading-relaxed line-clamp-2">{issue.description}</p>

          <div className="flex flex-wrap gap-3 mt-3 sm:hidden">
            <MetaTag label="Impact" value={issue.expectedImpact} />
            <MetaTag label="Effort" value={issue.effort} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm transition-all ${
              isOpen
                ? 'bg-brand-soft border-brand/25 text-brand rotate-0'
                : 'bg-surface border-line text-faint group-hover:border-brand/20'
            }`}
          >
            <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              ▾
            </motion.span>
          </span>
          <div className="hidden sm:flex flex-col gap-1.5 items-end">
            <MetaTag label="Impact" value={issue.expectedImpact} compact />
            <MetaTag label="Effort" value={issue.effort} compact />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 sm:px-8 pb-6 sm:pl-[4.5rem]">
              <div className="grid lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-surface rounded-2xl p-5 border border-line-soft">
                  <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    Why it matters
                  </p>
                  <p className="text-sm text-dim leading-relaxed">{issue.whyItMatters}</p>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-line-soft">
                  <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                    How to fix it
                  </p>
                  <ol className="space-y-3">
                    {issue.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3 items-start text-sm text-ink">
                        <span className="w-7 h-7 rounded-lg bg-brand-soft text-brand font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="pt-1 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {issue.code && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-2">Code snippet</p>
                  <pre className="code-block rounded-2xl p-5 text-xs font-mono overflow-x-auto leading-relaxed shadow-inner">
                    <code>{issue.code.body}</code>
                  </pre>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs bg-brand-soft/60 border border-brand/15 rounded-xl px-4 py-2.5">
                  <span className="text-faint">Expected impact</span>
                  <strong className="text-brand">{issue.expectedImpact}</strong>
                </div>
                <div className="flex items-center gap-2 text-xs bg-surface border border-line-soft rounded-xl px-4 py-2.5">
                  <span className="text-faint">Effort</span>
                  <strong className="text-ink">{issue.effort}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MetaTag({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <span className={`text-[10px] ${compact ? 'text-right' : ''}`}>
      <span className="text-faint">{label}</span>{' '}
      <span className="font-medium text-dim">{value}</span>
    </span>
  );
}
