import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ReadinessGauge } from '../components/ReadinessGauge';
import { api } from '../lib/api';
import type { ScanStatus } from '../types';

export function NewScanPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  return (
    <AppShell>
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="font-display text-2xl font-semibold mb-1">New scan</h1>
        <p className="text-text-dim text-sm mb-8">Enter a URL to audit for AI search readiness</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-sig-critical bg-sig-critical/10 border border-sig-critical/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-text-dim mb-1.5">Website URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-text placeholder:text-text-faint focus:border-brand transition-colors font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full bg-brand text-bg font-semibold py-3 rounded-xl hover:bg-brand-deep transition-colors disabled:opacity-50"
          >
            {loading ? 'Validating…' : 'Run scan'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

export function ScanProgressPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const poll = async () => {
      try {
        const data = await api.scans.status(id);
        setStatus(data);

        if (data.status === 'done') {
          setTimeout(() => navigate(`/app/results/${id}`), 1200);
        } else if (data.status === 'failed') {
          setError(data.error ?? 'Scan failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get scan status');
      }
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [id, navigate]);

  return (
    <AppShell>
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh]">
        {error ? (
          <div className="text-center max-w-md">
            <div className="text-sig-critical text-lg font-medium mb-2">Scan failed</div>
            <p className="text-text-dim text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/app/scan')}
              className="text-brand hover:text-brand-deep text-sm font-medium"
            >
              Try another URL →
            </button>
          </div>
        ) : (
          <>
            <ReadinessGauge
              mode={status?.status === 'done' ? 'complete' : 'scanning'}
              score={status?.overallScore ?? undefined}
              band={status?.band ?? undefined}
              progress={status?.progress ?? []}
              statusMessage={status?.statusMessage ?? 'Initializing scan…'}
              size={360}
            />
            <p className="text-text-faint text-xs mt-8 font-mono truncate max-w-md">
              {status ? 'Analyzing…' : 'Starting…'}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
