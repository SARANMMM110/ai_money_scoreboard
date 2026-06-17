import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ScanCard } from '../components/ScanCard';
import { ScoreHistoryChart } from '../components/ScoreHistoryChart';
import { api } from '../lib/api';
import { getScoreColor } from '../types';
import type { ScanSummary } from '../types';

export function DashboardPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    api.scans.list().then((res) => setScans(res.scans)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRescan = async (id: string) => {
    const { scanId } = await api.scans.rescan(id);
    navigate(`/app/scan/${scanId}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scan?')) return;
    await api.scans.delete(id);
    load();
  };

  const latestScore = scans.find((s) => s.status === 'done' && s.overallScore != null);

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
            <p className="text-text-dim text-sm mt-1">Your AI search readiness at a glance</p>
          </div>
          <Link
            to="/app/scan"
            className="bg-brand text-bg text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-deep transition-colors"
          >
            New scan
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total scans" value={String(scans.length)} />
          <StatCard
            label="Latest score"
            value={latestScore?.overallScore != null ? String(latestScore.overallScore) : '—'}
            color={latestScore?.overallScore != null ? getScoreColor(latestScore.overallScore) : undefined}
          />
          <StatCard label="Latest band" value={latestScore?.band ?? '—'} />
        </div>

        <ScoreHistoryChart scans={scans} />

        <h2 className="text-sm font-medium text-text-dim mb-4">Recent scans</h2>
        {loading ? (
          <p className="text-text-faint text-sm">Loading scans…</p>
        ) : scans.length === 0 ? (
          <div className="bg-surface border border-line border-dashed rounded-xl p-12 text-center">
            <p className="text-text-dim mb-4">No scans yet. Drop in a URL to see how AI reads your site.</p>
            <Link to="/app/scan" className="text-brand hover:text-brand-deep text-sm font-medium">
              Run your first scan →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {scans.slice(0, 6).map((scan) => (
              <ScanCard key={scan.id} scan={scan} onRescan={handleRescan} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-5">
      <p className="text-xs text-text-faint mb-1">{label}</p>
      <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: color ?? 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}
