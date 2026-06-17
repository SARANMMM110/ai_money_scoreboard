import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ReadinessGauge } from '../components/ReadinessGauge';
import { CategoryCard } from '../components/CategoryCard';
import { IssueList, QuickWinsStrip } from '../components/IssueList';
import { api } from '../lib/api';
import type { ScanResult } from '../types';

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!id) return;
    api.scans.get(id).then(setScan).finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    setReportLoading(true);
    try {
      const { pdfUrl, shareToken } = await api.scans.generateReport(id);
      setShareUrl(`${window.location.origin}/api/reports/r/${shareToken}`);
      window.open(pdfUrl, '_blank');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-8 text-text-dim text-sm">Loading results…</div>
      </AppShell>
    );
  }

  if (!scan || scan.status !== 'done') {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <p className="text-text-dim">{scan?.error ?? 'Results not available'}</p>
          <Link to="/app/scan" className="text-brand text-sm mt-4 inline-block">Start new scan</Link>
        </div>
      </AppShell>
    );
  }

  const topFinding = (category: string) =>
    scan.issues.find((i) => i.category === category)?.name ?? 'No major issues detected';

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-8 mb-12">
          <ReadinessGauge
            mode="complete"
            score={scan.overallScore ?? 0}
            band={scan.band ?? undefined}
            progress={scan.categories.map((c) => ({ category: c.category, status: 'done', score: c.score }))}
            size={280}
          />
          <div className="flex-1 text-center lg:text-left">
            <p className="text-text-faint text-xs font-mono mb-2 truncate max-w-md">{scan.url}</p>
            <h1 className="font-display text-2xl font-semibold mb-2">AI Money Score</h1>
            <p className="text-text-dim text-sm mb-6">
              Scanned {new Date(scan.scanDate).toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <button
                onClick={handleDownload}
                disabled={reportLoading}
                className="bg-brand text-bg text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-50"
              >
                {reportLoading ? 'Generating…' : 'Download report'}
              </button>
              <Link
                to={`/app/report/${id}`}
                className="bg-surface-2 text-text text-sm px-4 py-2 rounded-lg border border-line hover:border-brand/30 transition-colors"
              >
                Print view
              </Link>
            </div>
            {shareUrl && (
              <p className="text-xs text-text-dim mt-3 break-all">
                Share: <a href={shareUrl} className="text-brand" target="_blank" rel="noreferrer">{shareUrl}</a>
              </p>
            )}
          </div>
        </div>

        <h2 className="text-sm font-medium text-text-dim mb-4">Category breakdown</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {scan.categories.map((cat, i) => (
            <CategoryCard
              key={cat.category}
              label={cat.label}
              score={cat.score}
              maxScore={cat.maxScore}
              finding={topFinding(cat.category)}
              index={i}
            />
          ))}
        </div>

        <div className="mb-10">
          <QuickWinsStrip issues={scan.quickWins} />
        </div>

        <h2 className="text-sm font-medium text-text-dim mb-4">Issues & recommendations</h2>
        <IssueList issues={scan.issues} />
      </div>
    </AppShell>
  );
}

export function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (!id) return;
    api.scans.get(id).then(setScan);
  }, [id]);

  if (!scan) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 max-w-3xl mx-auto print:p-0">
      <style>{`@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <button onClick={() => window.print()} className="print:hidden mb-6 text-sm bg-gray-900 text-white px-4 py-2 rounded-lg">
        Print
      </button>
      <h1 className="text-3xl font-bold mb-2">AI Money Scoreboard Report</h1>
      <p className="text-gray-600 mb-1">{scan.url}</p>
      <p className="text-gray-500 text-sm mb-8">{new Date(scan.scanDate).toLocaleString()}</p>
      <div className="text-6xl font-bold font-mono mb-2" style={{ color: '#3DD4C0' }}>{scan.overallScore}</div>
      <p className="text-gray-600 mb-8">{scan.band}</p>
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Category Scores</h2>
      <table className="w-full mb-8">
        <tbody>
          {scan.categories.map((c) => (
            <tr key={c.category} className="border-b">
              <td className="py-2">{c.label}</td>
              <td className="py-2 text-right font-mono">{c.score}/{c.maxScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Issues</h2>
      {scan.issues.map((i) => (
        <div key={i.id} className="mb-4">
          <strong>{i.name}</strong> ({i.priority})
          <p className="text-gray-600 text-sm">{i.problem ?? i.description}</p>
          {i.solution && <p className="text-sm mt-1"><em>Solution:</em> {i.solution}</p>}
        </div>
      ))}
    </div>
  );
}
