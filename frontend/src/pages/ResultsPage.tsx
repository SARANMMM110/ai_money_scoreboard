import { useEffect, useState } from 'react';
import { PRODUCT_NAME } from '../components/BrandLogo';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell';
import { ReadinessGauge } from '../components/ReadinessGauge';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { IssuesSection } from '../components/IssuesSection';
import { QuickWinsSection } from '../components/QuickWinsSection';
import { IconGlobe, IconDocument, IconArrowRight, IconSparkle, IconTarget, IconShield } from '../components/icons';
import { api } from '../lib/api';
import { getScoreColor, getVerdict } from '../types';
import type { ScanResult } from '../types';

function bandStyle(score: number) {
  if (score >= 80) return { bg: 'bg-ready-soft', text: 'text-ready', border: 'border-ready/25', dot: 'bg-ready' };
  if (score >= 60) return { bg: 'bg-good-soft', text: 'text-good', border: 'border-good/25', dot: 'bg-good' };
  if (score >= 40) return { bg: 'bg-caution-soft', text: 'text-caution', border: 'border-caution/25', dot: 'bg-caution' };
  return { bg: 'bg-critical-soft', text: 'text-critical', border: 'border-critical/25', dot: 'bg-critical' };
}

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [expandIssueId, setExpandIssueId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = () =>
      api.scans
        .get(id)
        .then((data) => {
          if (!cancelled) setScan(data);
        })
        .catch(() => {
          /* auth errors surface via api client */
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

    load();

    const interval = setInterval(() => {
      api.scans.get(id).then((data) => {
        if (cancelled) return;
        setScan(data);
        const stillPolling =
          data.reprocessing ||
          (data.issues.length === 0 && data.status === 'done');
        if (!stillPolling) clearInterval(interval);
      }).catch(() => {});
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  const handleDownload = async () => {
    if (!id || !scan) return;
    setReportLoading(true);
    try {
      await api.scans.generateReport(id);
      const blob = await api.scans.downloadReportPdf(id);
      const safeName = (() => {
        try {
          return new URL(scan.url).hostname.replace(/[^a-z0-9]/gi, '-');
        } catch {
          return 'report';
        }
      })();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `ai-score-report-${safeName}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const jumpToIssue = (issueId: string) => {
    setExpandIssueId(issueId);
    document.getElementById(`issue-${issueId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) {
    return (
      <AppShell>
        <ResultsSkeleton />
      </AppShell>
    );
  }

  if (!scan || scan.status !== 'done') {
    return (
      <AppShell>
        <div className="min-h-full bg-header-wave flex items-center justify-center p-8">
          <div className="bg-surface border border-line rounded-2xl p-10 text-center shadow-card max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-critical-soft text-critical flex items-center justify-center mx-auto mb-4">
              <IconTarget size={28} />
            </div>
            <p className="text-ink font-medium mb-1">Results unavailable</p>
            <p className="text-dim text-sm mb-6">{scan?.error ?? 'This scan did not complete successfully.'}</p>
            <Link
              to="/app/scan"
              className="inline-flex items-center gap-2 bg-brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Start new scan
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const score = scan.overallScore ?? 0;
  const highCount = scan.issues.filter((i) => i.priority === 'high').length;
  const band = bandStyle(score);
  const scoreColor = getScoreColor(score);
  const hostname = (() => {
    try {
      return new URL(scan.url).hostname;
    } catch {
      return scan.url;
    }
  })();

  const topFinding = (category: string) =>
    scan.issues.find((i) => i.category === category)?.name ?? 'No major issues detected';

  return (
    <AppShell>
      <div className="min-h-full bg-header-wave">
        <div className="w-full px-6 sm:px-8 pt-6 pb-12">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-brand transition-colors"
            >
              ← Back to scans
            </Link>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand-soft border border-brand/20 px-3 py-1 rounded-full">
              Verified audit
            </span>
          </div>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative bg-surface border border-line rounded-3xl shadow-panel overflow-hidden mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.04] via-transparent to-purple/[0.03] pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: scoreColor }} />

            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col xl:flex-row items-center gap-8 lg:gap-12">
                <div className="shrink-0">
                  <ReadinessGauge
                    mode="complete"
                    score={score}
                    band={scan.band ?? undefined}
                    progress={scan.categories.map((c) => ({ category: c.category, status: 'done', score: c.score }))}
                    size={260}
                  />
                </div>

                <div className="flex-1 w-full text-center xl:text-left">
                  <div className="inline-flex items-center gap-2 bg-surface-2 border border-line rounded-full px-3 py-1.5 mb-4 max-w-full">
                    <IconGlobe size={14} className="text-brand shrink-0" />
                    <span className="text-xs text-dim truncate">{scan.url}</span>
                  </div>

                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-2">
                    {hostname}
                  </h1>
                  <p className="text-sm text-faint mb-4">
                    Full-site crawl · Signal validation · Reproducible score
                  </p>

                  <div className="flex flex-wrap items-center gap-3 justify-center xl:justify-start mb-4">
                    <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full border ${band.bg} ${band.text} ${band.border}`}>
                      <span className={`w-2 h-2 rounded-full ${band.dot}`} />
                      {scan.band ?? 'Unrated'}
                    </span>
                    <span className="text-xs text-faint">
                      Scanned {new Date(scan.scanDate).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-dim text-sm leading-relaxed max-w-xl mb-6 mx-auto xl:mx-0">
                    {getVerdict(score)}
                  </p>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto xl:mx-0 mb-6">
                    <MetricCard icon={<IconTarget size={16} className="text-critical" />} iconBg="bg-critical-soft" label="Issues" value={String(scan.issues.length)} />
                    <MetricCard icon={<IconSparkle size={16} className="text-brand" />} iconBg="bg-brand-soft" label="Quick wins" value={String(scan.quickWins.length)} />
                    <MetricCard icon={<IconShield size={16} className="text-caution" />} iconBg="bg-caution-soft" label="High priority" value={String(highCount)} />
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center xl:justify-start">
                    <button
                      onClick={handleDownload}
                      disabled={reportLoading}
                      className="inline-flex items-center gap-2 bg-brand-gradient text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-[0_8px_24px_rgba(14,169,141,0.3)] hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <IconDocument size={16} />
                      {reportLoading ? 'Generating…' : 'Download report'}
                    </button>
                    <Link
                      to={`/app/report/${id}`}
                      className="inline-flex items-center gap-2 bg-surface text-ink text-sm font-medium px-5 py-3 rounded-2xl border border-line hover:border-brand/30 hover:shadow-card transition-all"
                    >
                      Print view
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <CategoryBreakdown categories={scan.categories} topFinding={topFinding} />
          <div className="mb-10">
            <QuickWinsSection issues={scan.quickWins} onSelect={jumpToIssue} />
          </div>
          {scan.reprocessing && scan.issues.length === 0 && (
            <div className="mb-6 bg-brand-soft border border-brand/20 rounded-2xl p-4 text-sm text-dim flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              Regenerating detailed fixes… refresh in a few seconds.
            </div>
          )}
          <IssuesSection issues={scan.issues} expandId={expandIssueId} />
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface-2/80 border border-line-soft rounded-2xl px-4 py-3 text-center">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center mx-auto mb-2`}>{icon}</div>
      <p className="font-mono text-xl font-bold text-ink tabular-nums">{value}</p>
      <p className="text-[10px] text-faint uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="min-h-full bg-header-wave px-6 sm:px-8 pt-6 pb-12 animate-pulse">
      <div className="h-4 w-32 bg-line rounded mb-6" />
      <div className="bg-surface border border-line rounded-3xl p-10 mb-8">
        <div className="flex flex-col xl:flex-row items-center gap-10">
          <div className="w-[260px] h-[260px] rounded-full bg-surface-2" />
          <div className="flex-1 w-full space-y-4">
            <div className="h-8 w-48 bg-line rounded-full mx-auto xl:mx-0" />
            <div className="h-10 w-64 bg-line rounded mx-auto xl:mx-0" />
            <div className="h-4 w-full max-w-md bg-line-soft rounded mx-auto xl:mx-0" />
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto xl:mx-0">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-20 bg-surface-2 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <div key={n} className="h-36 bg-surface border border-line rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.scans.get(id).then(setScan).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-bg p-8 text-dim text-sm">Loading report…</div>;
  }

  if (!scan || scan.status !== 'done') {
    return (
      <div className="min-h-screen bg-bg p-8 text-center">
        <p className="text-dim">Report not available for this scan.</p>
        <Link to="/app" className="text-brand text-sm mt-4 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink p-8 max-w-3xl mx-auto print:p-0 print:bg-white">
      <style>{`@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <button onClick={() => window.print()} className="print:hidden mb-6 text-sm bg-brand text-white px-4 py-2 rounded-xl">
        Print
      </button>
      <h1 className="text-3xl font-bold mb-2 font-display">{PRODUCT_NAME} Report</h1>
      <p className="text-dim mb-1">{scan.url}</p>
      <p className="text-faint text-sm mb-8">{new Date(scan.scanDate).toLocaleString()}</p>
      <div className="text-6xl font-bold font-mono mb-2 text-brand">{scan.overallScore}</div>
      <p className="text-dim mb-8">{scan.band}</p>
      <h2 className="text-xl font-semibold mb-4 border-b border-line pb-2">Category Scores</h2>
      <table className="w-full mb-8">
        <tbody>
          {scan.categories.map((c) => (
            <tr key={c.category} className="border-b border-line">
              <td className="py-2">{c.label}</td>
              <td className="py-2 text-right font-mono">{c.score}/{c.maxScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="text-xl font-semibold mb-4 border-b border-line pb-2">Issues</h2>
      {scan.issues.map((i) => (
        <div key={i.id} className="mb-6 pb-4 border-b border-line-soft">
          <strong>{i.name}</strong> ({i.priority})
          <p className="text-dim text-sm mt-1">{i.description}</p>
          <p className="text-sm mt-2"><em>Why:</em> {i.whyItMatters}</p>
          <ol className="list-decimal ml-5 text-sm mt-2 space-y-1">
            {i.steps.map((s, idx) => <li key={idx}>{s}</li>)}
          </ol>
          {i.code && (
            <pre className="code-block rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed mt-2">{i.code.body}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
