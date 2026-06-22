import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconGlobe,
  IconMonitor,
  IconClock,
  IconRefresh,
  IconArrowRight,
  IconMoreVertical,
} from './icons';
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
  return { label: scan.band ?? 'Good', dot: 'bg-good', text: 'text-good' };
}

function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

interface HistoryScanRowProps {
  scan: ScanSummary;
  index?: number;
  compareMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRescan?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function HistoryScanRow({
  scan,
  index = 0,
  compareMode = false,
  selected = false,
  onSelect,
  onRescan,
  onDelete,
}: HistoryScanRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const accent = getAccent(scan);
  const styles = accentStyles[accent];
  const status = statusLabel(scan);
  const scoreColor = scan.overallScore != null ? getScoreColor(scan.overallScore) : 'var(--faint)';
  const date = new Date(scan.scanDate);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="bg-surface border border-line rounded-2xl shadow-card hover:shadow-panel transition-shadow"
    >
      <div className="flex items-center gap-3 sm:gap-4 p-4 pl-0">
        <div className={`w-1 self-stretch rounded-full shrink-0 min-h-[72px] ${styles.border}`} />

        {compareMode && (
          <label className="pl-3 flex items-center shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect?.(scan.id)}
              className="w-4 h-4 rounded border-line text-brand focus:ring-brand/30"
            />
          </label>
        )}

        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg} ${styles.iconColor}`}>
          <IconGlobe size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{displayUrl(scan.url)}</p>
          <p className="text-xs text-faint mt-0.5">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {', '}
            {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              <IconMonitor size={12} />
              Full audit
            </span>
            {scan.status === 'done' && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/15">
                <IconClock size={12} />
                Completed
              </span>
            )}
          </div>
        </div>

        <div className="hidden md:block text-center shrink-0 w-20">
          <p className="text-[11px] text-faint mb-0.5">Score</p>
          {scan.status === 'done' && scan.overallScore != null ? (
            <div>
              <p className="font-mono text-2xl font-bold tabular-nums leading-none" style={{ color: scoreColor }}>
                {scan.overallScore}
              </p>
              <p className="text-[10px] text-faint mt-0.5">/100</p>
            </div>
          ) : (
            <p className="font-mono text-2xl font-bold text-faint leading-none">—</p>
          )}
        </div>

        <div className="hidden lg:block text-center shrink-0 w-24">
          <p className="text-[11px] text-faint mb-1.5">Status</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-line bg-surface-2 ${status.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {scan.status === 'done' ? (
            <Link
              to={`/app/results/${scan.id}`}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-brand border border-brand/30 bg-brand-soft/50 px-3.5 py-2 rounded-xl hover:bg-brand-soft transition-colors"
            >
              View Report
              <IconArrowRight size={13} />
            </Link>
          ) : scan.status === 'failed' && onRescan ? (
            <button
              type="button"
              onClick={() => onRescan(scan.id)}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-brand border border-brand/30 bg-brand-soft/50 px-3.5 py-2 rounded-xl hover:bg-brand-soft transition-colors"
            >
              <IconRefresh size={13} />
              Retry Scan
            </button>
          ) : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-xl border border-line bg-surface-2 flex items-center justify-center text-faint hover:text-ink hover:border-line transition-colors"
              aria-label="More options"
            >
              <IconMoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-line rounded-xl shadow-panel py-1 min-w-[148px]">
                {scan.status === 'done' && (
                  <Link
                    to={`/app/results/${scan.id}`}
                    className="block px-4 py-2.5 text-xs text-ink hover:bg-surface-2 sm:hidden"
                    onClick={() => setMenuOpen(false)}
                  >
                    View Report
                  </Link>
                )}
                {onRescan && (
                  <button
                    type="button"
                    onClick={() => { onRescan(scan.id); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-ink hover:bg-surface-2"
                  >
                    Rescan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.(scan.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-critical hover:bg-critical-soft border-t border-line-soft"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
