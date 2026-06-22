import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconGlobe, IconChevronRight } from './icons';
import { getScoreColor } from '../types';
import type { ScanSummary } from '../types';

type Accent = 'brand' | 'critical' | 'purple' | 'caution' | 'good';

function getAccent(scan: ScanSummary): Accent {
  if (scan.status === 'failed') return 'purple';
  if (scan.status !== 'done' || scan.overallScore == null) return 'brand';
  if (scan.overallScore < 40) return 'critical';
  if (scan.overallScore < 60) return 'caution';
  return 'good';
}

const accentStyles: Record<Accent, { border: string; iconBg: string; iconColor: string }> = {
  brand: { border: 'bg-brand', iconBg: 'bg-brand-soft', iconColor: 'text-brand' },
  critical: { border: 'bg-critical', iconBg: 'bg-critical-soft', iconColor: 'text-critical' },
  purple: { border: 'bg-purple', iconBg: 'bg-purple-soft', iconColor: 'text-purple' },
  caution: { border: 'bg-caution', iconBg: 'bg-caution-soft', iconColor: 'text-caution' },
  good: { border: 'bg-good', iconBg: 'bg-good-soft', iconColor: 'text-good' },
};

function statusLabel(scan: ScanSummary): { label: string; dot: string; text: string } {
  if (scan.status === 'failed') return { label: 'Failed', dot: 'bg-critical', text: 'text-critical' };
  if (scan.status === 'running' || scan.status === 'queued') return { label: 'Scanning', dot: 'bg-brand animate-pulse', text: 'text-brand' };
  if (scan.overallScore != null && scan.overallScore < 40) return { label: scan.band ?? 'Critical', dot: 'bg-critical', text: 'text-critical' };
  if (scan.overallScore != null && scan.overallScore < 60) return { label: scan.band ?? 'Needs work', dot: 'bg-caution', text: 'text-caution' };
  return { label: scan.band ?? 'Done', dot: 'bg-good', text: 'text-good' };
}

export function ScanRow({ scan, index = 0 }: { scan: ScanSummary; index?: number }) {
  const accent = getAccent(scan);
  const styles = accentStyles[accent];
  const status = statusLabel(scan);
  const scoreColor = scan.overallScore != null ? getScoreColor(scan.overallScore) : 'var(--faint)';
  const date = new Date(scan.scanDate);

  const href = scan.status === 'done' ? `/app/results/${scan.id}` : `/app/scan/${scan.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        to={href}
        className="group flex items-center gap-4 bg-surface border border-line rounded-2xl p-4 pl-0 shadow-card hover:shadow-panel hover:-translate-y-0.5 transition-all overflow-hidden"
      >
        <div className={`w-1 self-stretch rounded-full shrink-0 ${styles.border}`} />

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg} ${styles.iconColor}`}>
          <IconGlobe size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{scan.url}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-faint">
              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-faint text-xs">·</span>
            <span className="text-xs text-faint">
              {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-faint border border-line">
              Full audit
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          {scan.status === 'done' && scan.overallScore != null ? (
            <>
              <p className="font-mono text-xl font-bold tabular-nums" style={{ color: scoreColor }}>
                {scan.overallScore}
              </p>
              <p className="text-[11px] text-faint">Score</p>
            </>
          ) : scan.status === 'failed' ? (
            <>
              <p className="font-mono text-xl font-bold text-faint">—</p>
              <p className="text-[11px] text-faint">Score</p>
            </>
          ) : (
            <>
              <p className="font-mono text-xl font-bold text-brand animate-pulse">…</p>
              <p className="text-[11px] text-faint">Scanning</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-line bg-surface-2 ${status.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className="w-9 h-9 rounded-full border border-line bg-surface-2 flex items-center justify-center text-faint group-hover:text-brand group-hover:border-brand/30 transition-colors">
            <IconChevronRight size={16} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
