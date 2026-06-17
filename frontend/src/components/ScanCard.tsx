import { Link } from 'react-router-dom';
import { getScoreColor } from '../types';
import type { ScanSummary } from '../types';

interface ScanCardProps {
  scan: ScanSummary;
  onRescan?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function ScanCard({ scan, onRescan, onDelete, selectable, selected, onSelect }: ScanCardProps) {
  const scoreColor = scan.overallScore != null ? getScoreColor(scan.overallScore) : 'var(--text-faint)';

  return (
    <div
      className={`group bg-surface border border-line rounded-xl p-5 hover:border-brand/30 hover:shadow-panel transition-all ${
        selected ? 'ring-2 ring-brand' : ''
      } ${selectable ? 'cursor-pointer' : ''}`}
      onClick={() => selectable && onSelect?.(scan.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text truncate font-medium">{scan.url}</p>
          <p className="text-xs text-text-faint mt-1">
            {new Date(scan.scanDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="text-right shrink-0">
          {scan.status === 'done' && scan.overallScore != null ? (
            <>
              <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: scoreColor }}>
                {scan.overallScore}
              </div>
              <div className="text-xs text-text-dim">{scan.band}</div>
            </>
          ) : scan.status === 'failed' ? (
            <span className="text-xs text-sig-critical">Failed</span>
          ) : (
            <span className="text-xs text-brand animate-pulse">Scanning…</span>
          )}
        </div>
      </div>

      {scan.status === 'done' && !selectable && (
        <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/app/results/${scan.id}`}
            className="text-xs px-3 py-1.5 bg-brand/10 text-brand rounded-md hover:bg-brand/20 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View Report
          </Link>
          {onRescan && (
            <button
              onClick={(e) => { e.stopPropagation(); onRescan(scan.id); }}
              className="text-xs px-3 py-1.5 bg-surface-2 text-text-dim rounded-md hover:text-text transition-colors"
            >
              Rescan
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(scan.id); }}
              className="text-xs px-3 py-1.5 text-text-faint hover:text-sig-critical transition-colors ml-auto"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
