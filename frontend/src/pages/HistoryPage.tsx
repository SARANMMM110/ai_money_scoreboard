import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ScanCard } from '../components/ScanCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getScoreColor } from '../types';
import type { ScanSummary } from '../types';

export function HistoryPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<Awaited<ReturnType<typeof api.scans.compare>> | null>(null);
  const navigate = useNavigate();

  const load = (q?: string) => {
    setLoading(true);
    api.scans.list({ search: q }).then((res) => setScans(res.scans)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  };

  const runCompare = async () => {
    if (selected.length !== 2) return;
    const result = await api.scans.compare(selected[0]!, selected[1]!);
    setCompareResult(result);
  };

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold">History</h1>
            <p className="text-text-dim text-sm mt-1">Search and compare past scans</p>
          </div>
          <button
            onClick={() => { setCompareMode(!compareMode); setSelected([]); setCompareResult(null); }}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
              compareMode ? 'border-brand text-brand bg-brand/10' : 'border-line text-text-dim hover:text-text'
            }`}
          >
            {compareMode ? 'Cancel compare' : 'Compare scans'}
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by URL…"
            className="w-full max-w-md bg-surface border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-brand"
          />
        </form>

        {compareMode && selected.length === 2 && (
          <button
            onClick={runCompare}
            className="mb-6 bg-brand text-bg text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-deep"
          >
            Compare selected
          </button>
        )}

        {compareResult && (
          <div className="bg-surface border border-line rounded-xl p-6 mb-8">
            <h3 className="font-medium mb-4">Comparison</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-text-faint text-xs">Scan A</p>
                <p className="truncate">{compareResult.scanA.url}</p>
                <p className="font-mono text-lg" style={{ color: getScoreColor(compareResult.scanA.overallScore ?? 0) }}>
                  {compareResult.scanA.overallScore}
                </p>
              </div>
              <div>
                <p className="text-text-faint text-xs">Scan B</p>
                <p className="truncate">{compareResult.scanB.url}</p>
                <p className="font-mono text-lg" style={{ color: getScoreColor(compareResult.scanB.overallScore ?? 0) }}>
                  {compareResult.scanB.overallScore}
                </p>
              </div>
            </div>
            <p className="font-mono text-sm mb-4">
              Overall delta:{' '}
              <span style={{ color: compareResult.overallDelta >= 0 ? 'var(--sig-good)' : 'var(--sig-critical)' }}>
                {compareResult.overallDelta >= 0 ? '+' : ''}{compareResult.overallDelta}
              </span>
            </p>
            <div className="space-y-2">
              {compareResult.deltas.map((d) => (
                <div key={d.category} className="flex items-center justify-between text-sm border-b border-line pb-2">
                  <span className="text-text-dim">{d.label}</span>
                  <span className="font-mono tabular-nums">
                    {d.scoreA} → {d.scoreB}{' '}
                    <span style={{ color: d.delta >= 0 ? 'var(--sig-good)' : 'var(--sig-critical)' }}>
                      ({d.delta >= 0 ? '+' : ''}{d.delta})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-text-faint text-sm">Loading…</p>
        ) : scans.length === 0 ? (
          <p className="text-text-dim text-sm">No scans found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {scans.map((scan) => (
              <ScanCard
                key={scan.id}
                scan={scan}
                selectable={compareMode}
                selected={selected.includes(scan.id)}
                onSelect={toggleSelect}
                onRescan={(id) => api.scans.rescan(id).then(({ scanId }) => navigate(`/app/scan/${scanId}`))}
                onDelete={(id) => api.scans.delete(id).then(() => load(search))}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  return (
    <AppShell>
      <div className="p-8 max-w-lg">
        <h1 className="font-display text-2xl font-semibold mb-6">Settings</h1>
        <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <div>
            <p className="text-xs text-text-faint mb-1">Email</p>
            <p className="text-sm">{user?.email}</p>
          </div>
          {user?.name && (
            <div>
              <p className="text-xs text-text-faint mb-1">Name</p>
              <p className="text-sm">{user.name}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="text-sm text-sig-critical hover:text-sig-critical/80 transition-colors pt-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
