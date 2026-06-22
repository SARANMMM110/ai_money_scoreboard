import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell';
import { HistoryScanRow } from '../components/HistoryScanRow';
import { ScanPageDecor } from '../components/ScanPageDecor';
import { IconSearch, IconFilter, IconCompare, IconDocument, IconPlus } from '../components/icons';
import { api } from '../lib/api';
import { getScoreColor } from '../types';
import type { ScanSummary } from '../types';

type StatusFilter = 'all' | 'critical' | 'failed' | 'good';

function matchesFilter(scan: ScanSummary, filter: StatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'failed') return scan.status === 'failed';
  if (filter === 'critical') return scan.status === 'done' && (scan.overallScore ?? 100) < 40;
  if (filter === 'good') return scan.status === 'done' && (scan.overallScore ?? 0) >= 60;
  return true;
}

export function HistoryPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<Awaited<ReturnType<typeof api.scans.compare>> | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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

  const filteredScans = scans.filter((s) => matchesFilter(s, statusFilter));

  const toggleCompareMode = () => {
    setCompareMode((m) => !m);
    setSelected([]);
    setCompareResult(null);
  };

  return (
    <AppShell>
      <div className="relative w-full min-h-full bg-scan-page overflow-hidden">
        <ScanPageDecor />

        <div className="relative z-10 w-full px-6 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink tracking-tight">History</h1>
              <p className="text-dim text-sm mt-1">Review and compare your past AI search scans.</p>
            </div>
            <button
              type="button"
              onClick={toggleCompareMode}
              className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all shrink-0 ${
                compareMode
                  ? 'border-brand text-brand bg-brand-soft'
                  : 'border-brand/40 text-brand bg-surface hover:bg-brand-soft/50'
              }`}
            >
              <IconCompare size={16} />
              {compareMode ? 'Cancel compare' : 'Compare scans'}
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3 mb-6">
            <div className="flex-1 flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10 transition-all">
              <IconSearch size={18} className="text-faint shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by URL..."
                className="w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className="inline-flex items-center gap-2 text-sm font-medium text-dim bg-surface border border-line rounded-xl px-4 py-3 shadow-card hover:border-brand/30 transition-colors h-full"
              >
                <IconFilter size={16} />
                <span className="hidden sm:inline">Filter</span>
                {statusFilter !== 'all' && (
                  <span className="w-2 h-2 rounded-full bg-brand" />
                )}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 bg-surface border border-line rounded-xl shadow-panel py-1 min-w-[160px]">
                    {(['all', 'critical', 'failed', 'good'] as StatusFilter[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setStatusFilter(f); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm capitalize hover:bg-surface-2 ${
                          statusFilter === f ? 'text-brand font-medium' : 'text-dim'
                        }`}
                      >
                        {f === 'all' ? 'All scans' : f}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </form>

          {compareMode && selected.length === 2 && (
            <button
              type="button"
              onClick={runCompare}
              className="mb-6 inline-flex items-center gap-2 bg-brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <IconCompare size={16} />
              Compare selected
            </button>
          )}

          {compareResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-line rounded-2xl shadow-panel p-6 mb-8"
            >
              <h3 className="font-display font-semibold text-ink mb-4">Comparison results</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-surface-2 rounded-xl p-4">
                  <p className="text-faint text-xs mb-1">Scan A</p>
                  <p className="truncate font-medium">{compareResult.scanA.url}</p>
                  <p className="font-mono text-2xl font-bold mt-1" style={{ color: getScoreColor(compareResult.scanA.overallScore ?? 0) }}>
                    {compareResult.scanA.overallScore}
                  </p>
                </div>
                <div className="bg-surface-2 rounded-xl p-4">
                  <p className="text-faint text-xs mb-1">Scan B</p>
                  <p className="truncate font-medium">{compareResult.scanB.url}</p>
                  <p className="font-mono text-2xl font-bold mt-1" style={{ color: getScoreColor(compareResult.scanB.overallScore ?? 0) }}>
                    {compareResult.scanB.overallScore}
                  </p>
                </div>
              </div>
              <p className="font-mono text-sm mb-4">
                Overall delta:{' '}
                <span style={{ color: compareResult.overallDelta >= 0 ? 'var(--good)' : 'var(--critical)' }}>
                  {compareResult.overallDelta >= 0 ? '+' : ''}{compareResult.overallDelta}
                </span>
              </p>
              <div className="space-y-2">
                {compareResult.deltas.map((d) => (
                  <div key={d.category} className="flex items-center justify-between text-sm border-b border-line-soft pb-2 last:border-0">
                    <span className="text-dim">{d.label}</span>
                    <span className="font-mono tabular-nums">
                      {d.scoreA} → {d.scoreB}{' '}
                      <span style={{ color: d.delta >= 0 ? 'var(--good)' : 'var(--critical)' }}>
                        ({d.delta >= 0 ? '+' : ''}{d.delta})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {loading ? (
            <p className="text-faint text-sm py-8">Loading scans…</p>
          ) : filteredScans.length === 0 ? (
            <div className="bg-surface border border-line border-dashed rounded-2xl p-12 text-center shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mx-auto mb-4 text-faint">
                <IconDocument size={28} />
              </div>
              <p className="font-medium text-ink mb-1">No scans found</p>
              <p className="text-sm text-faint mb-6">Run new scans to see them here.</p>
              <Link
                to="/app/scan"
                className="inline-flex items-center gap-2 bg-brand-gradient text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-[0_8px_24px_rgba(14,169,141,0.3)] hover:opacity-90 transition-opacity"
              >
                <IconPlus size={16} />
                New Scan
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScans.map((scan, i) => (
                <HistoryScanRow
                  key={scan.id}
                  scan={scan}
                  index={i}
                  compareMode={compareMode}
                  selected={selected.includes(scan.id)}
                  onSelect={toggleSelect}
                  onRescan={(id) => api.scans.rescan(id).then(({ scanId }) => navigate(`/app/scan/${scanId}`))}
                  onDelete={(id) => {
                    const label = scans.find((s) => s.id === id)?.url ?? 'this scan';
                    if (!confirm(`Delete scan for ${label.replace(/^https?:\/\//, '')}? This cannot be undone.`)) return;
                    api.scans.delete(id).then(() => {
                      setSelected((prev) => prev.filter((x) => x !== id));
                      load(search);
                    });
                  }}
                />
              ))}

              <div className="mt-6 bg-surface border border-line border-dashed rounded-2xl p-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center mx-auto mb-3 text-faint">
                  <IconDocument size={24} />
                </div>
                <p className="text-sm font-medium text-dim mb-1">No more scans yet</p>
                <p className="text-xs text-faint mb-5">Run new scans to see them here.</p>
                <Link
                  to="/app/scan"
                  className="inline-flex items-center gap-2 bg-brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  <IconPlus size={15} />
                  New Scan
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
