import { useEffect, useState, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell';
import { ScanPageDecor, ScanAnalyzerPanel } from '../components/ScanPageDecor';
import { ReadinessGauge } from '../components/ReadinessGauge';
import { IconGlobe, IconLink, IconSparkle, IconPlus, IconChevronRight } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CATEGORIES } from '../types';
import type { ScanStatus } from '../types';

const EXAMPLES = ['vercel.com', 'stripe.com', 'openai.com'];

function displayName(user: { name: string | null; email: string } | null) {
  if (!user) return 'there';
  if (user.name) return user.name.split(' ')[0]!;
  return user.email.split('@')[0]!;
}

export function NewScanPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { scanId } = await api.scans.create(url);
      navigate(`/app/scan/${scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  const fillExample = (domain: string) => {
    setUrl(`https://${domain}`);
    setError('');
  };

  return (
    <AppShell>
      <div className="relative w-full min-h-full bg-header-wave overflow-hidden">
        <ScanPageDecor />

        <div className="relative z-10 w-full px-6 sm:px-8 py-8 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8"
          >
            <div>
              <p className="text-sm text-faint mb-1">Ready when you are, {displayName(user)} 👋</p>
              <h1 className="font-display text-3xl font-bold text-ink tracking-tight">New Scan</h1>
              <p className="text-dim text-sm mt-1 max-w-xl">
                Enter a URL for a full-site AI readiness audit — schema, E-E-A-T, content depth, and more.
              </p>
            </div>
            <Link
              to="/app/history"
              className="inline-flex items-center gap-1.5 text-sm text-brand font-medium hover:text-brand-deep transition-colors shrink-0"
            >
              View history
              <IconChevronRight size={14} />
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="lg:col-span-3"
            >
              <div className="bg-surface border border-line rounded-2xl shadow-panel p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-brand bg-brand-soft border border-brand/20 px-3 py-1.5 rounded-full">
                    <IconSparkle size={14} />
                    AI SCAN
                  </span>
                  <span className="text-xs text-faint">Full site audit · verified score · 0–100</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="text-sm text-critical bg-critical-soft border border-critical/20 rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="scan-url" className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-soft flex items-center justify-center text-brand">
                        <IconGlobe size={18} />
                      </div>
                      Website URL
                    </label>

                    <div className="scan-pill-input flex items-center gap-3 bg-surface-2 border border-line rounded-2xl px-4 py-4 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 focus-within:bg-surface transition-all">
                      <IconLink size={18} className="text-faint shrink-0" />
                      <input
                        id="scan-url"
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        required
                        className="w-full bg-transparent text-ink placeholder:text-faint text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:shadow-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 bg-brand-gradient text-white font-semibold py-4 rounded-2xl shadow-[0_8px_24px_rgba(14,169,141,0.35)] hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    <IconSparkle size={16} />
                    {loading ? 'Validating URL…' : 'Run scan'}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-line-soft">
                  <p className="text-sm text-faint mb-3">Try an example</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((domain) => (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => fillExample(domain)}
                        className="inline-flex items-center gap-2 text-sm text-dim bg-surface-2 border border-line rounded-full px-4 py-2 hover:border-brand/40 hover:text-brand hover:bg-brand-soft/30 transition-all"
                      >
                        <IconGlobe size={14} className="text-faint" />
                        {domain}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <ScanAnalyzerPanel />
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function CategoryProgressList({ progress }: { progress: ScanStatus['progress'] }) {
  return (
    <div className="w-full max-w-md grid gap-2 mt-8">
      {CATEGORIES.map((cat) => {
        const p = progress.find((x) => x.category === cat.key);
        const st = p?.status ?? 'pending';
        return (
          <div
            key={cat.key}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
              st === 'done'
                ? 'bg-brand-soft/50 border-brand/20'
                : st === 'running'
                  ? 'bg-surface border-brand/40 shadow-[0_0_0_2px_rgba(14,169,141,0.1)]'
                  : 'bg-surface border-line'
            }`}
          >
            <span className={st === 'pending' ? 'text-faint' : 'text-ink font-medium'}>{cat.label}</span>
            <span className="text-xs">
              {st === 'done' && p?.score != null ? (
                <span className="font-mono text-brand font-semibold">{p.score}/{cat.max}</span>
              ) : st === 'running' ? (
                <span className="text-brand animate-pulse">Scanning…</span>
              ) : (
                <span className="text-faint">Pending</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ScanProgressPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval>;

    const stopPolling = () => {
      if (intervalId) clearInterval(intervalId);
    };

    const poll = async () => {
      try {
        const data = await api.scans.status(id);
        if (cancelled) return;
        setStatus(data);

        if (data.status === 'done') {
          stopPolling();
          setTimeout(() => navigate(`/app/results/${id}`), 1200);
        } else if (data.status === 'failed') {
          stopPolling();
          const msg = data.error ?? 'Scan failed';
          setError(
            msg.includes('tx.issue.create')
              ? 'This scan failed on an older server version. Start a fresh scan from New Scan — the fix is already deployed.'
              : msg.slice(0, 300),
          );
        }
      } catch (err) {
        if (cancelled) return;
        stopPolling();
        const msg = err instanceof Error ? err.message : 'Failed to get scan status';
        setError(msg.includes('sign in') ? `${msg} Refresh the page after signing in.` : msg);
      }
    };

    poll();
    intervalId = setInterval(poll, 1500);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [id, navigate]);

  return (
    <AppShell>
      <div className="relative w-full min-h-full bg-header-wave overflow-hidden">
        <ScanPageDecor />

        <div className="relative z-10 w-full px-6 sm:px-8 py-8 flex flex-col items-center min-h-[85vh]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center mb-6"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand-soft border border-brand/20 px-3 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              {error ? 'Scan failed' : status?.status === 'done' ? 'Complete' : 'Scanning'}
            </span>
            <h1 className="font-display text-2xl font-bold text-ink">
              {error ? 'Something went wrong' : 'Analyzing your site'}
            </h1>
            <p className="text-dim text-sm mt-1">
              {status?.statusMessage ?? 'Initializing scan…'}
            </p>
          </motion.div>

          {error ? (
            <div className="text-center max-w-md bg-surface border border-line rounded-2xl shadow-panel p-8">
              <p className="text-critical text-lg font-semibold mb-2">Scan failed</p>
              <p className="text-dim text-sm mb-6">{error}</p>
              <button
                onClick={() => navigate('/app/scan')}
                className="inline-flex items-center gap-2 bg-brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                <IconPlus size={14} />
                Try another URL
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <ReadinessGauge
                mode={status?.status === 'done' ? 'complete' : 'scanning'}
                score={status?.overallScore ?? undefined}
                band={status?.band ?? undefined}
                progress={status?.progress ?? []}
                statusMessage={status?.statusMessage ?? 'Initializing scan…'}
                size={340}
              />
              <CategoryProgressList progress={status?.progress ?? []} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
