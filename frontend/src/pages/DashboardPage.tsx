import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell';
import { ScanRow } from '../components/ScanRow';
import { MiniGauge } from '../components/MiniGauge';
import { ScoreTrends } from '../components/ModeScoreTrends';
import { IconBarChart, IconTarget, IconShield, IconPlus } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getScoreColor } from '../types';
import type { ScanSummary } from '../types';

function displayName(user: { name: string | null; email: string } | null) {
  if (!user) return 'there';
  if (user.name) return user.name.split(' ')[0]!;
  return user.email.split('@')[0]!;
}

export function DashboardPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.scans.list().then((res) => setScans(res.scans)).finally(() => setLoading(false));
  }, []);

  const latest = scans.find((s) => s.status === 'done' && s.overallScore != null);
  const bandColor = latest?.overallScore != null ? getScoreColor(latest.overallScore) : 'var(--faint)';
  const bandSubtitle =
    latest?.overallScore != null && latest.overallScore < 40
      ? 'Needs attention'
      : latest?.overallScore != null && latest.overallScore < 60
        ? 'Room to improve'
        : latest?.band ?? 'No scans yet';

  return (
    <AppShell>
      <div className="w-full min-h-full bg-header-wave">
        <div className="w-full px-8 pt-8 pb-10">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-faint mb-1">Welcome back, {displayName(user)}! 👋</p>
              <h1 className="font-display text-3xl font-bold text-ink tracking-tight">Dashboard</h1>
              <p className="text-dim text-sm mt-1">Your AI search readiness at a glance</p>
            </div>
            <Link
              to="/app/scan"
              className="inline-flex items-center gap-2 bg-brand-gradient text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-[0_8px_24px_rgba(14,169,141,0.35)] hover:opacity-90 transition-opacity shrink-0"
            >
              <IconPlus size={16} />
              New scan
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            <StatCard
              icon={<IconBarChart className="text-brand" />}
              iconBg="bg-brand-soft"
              label="Total scans"
              sublabel="All time scans"
              value={String(scans.length)}
              footer={<ScoreTrends scans={scans} />}
            />

            <StatCard
              icon={<IconTarget className="text-critical" />}
              iconBg="bg-critical-soft"
              label="Latest score"
              sublabel="Out of 100"
              value={latest?.overallScore != null ? String(latest.overallScore) : '—'}
              valueColor={latest?.overallScore != null ? getScoreColor(latest.overallScore) : undefined}
              trailing={latest?.overallScore != null ? <MiniGauge score={latest.overallScore} /> : undefined}
            />

            <StatCard
              icon={<IconShield className="text-purple" />}
              iconBg="bg-purple-soft"
              label="Latest band"
              sublabel={bandSubtitle}
              value={latest?.band ?? '—'}
              valueColor={bandColor}
              decorative={
                latest?.overallScore != null && latest.overallScore < 40 ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
                    <IconTarget size={80} className="text-critical" />
                  </div>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-ink">Recent scans</h2>
            <Link to="/app/history" className="text-sm text-brand font-medium hover:text-brand-deep transition-colors">
              View all history →
            </Link>
          </div>

          {loading ? (
            <p className="text-faint text-sm">Loading scans…</p>
          ) : scans.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-surface border border-line border-dashed rounded-2xl p-14 text-center shadow-card"
            >
              <p className="text-dim mb-4">No scans yet. Drop in a URL to see how AI reads your site.</p>
              <Link to="/app/scan" className="inline-flex items-center gap-2 text-brand hover:text-brand-deep text-sm font-semibold">
                <IconPlus size={14} />
                Run your first scan
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {scans.slice(0, 6).map((scan, i) => (
                <ScanRow key={scan.id} scan={scan} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  sublabel,
  value,
  valueColor,
  trailing,
  footer,
  decorative,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sublabel: string;
  value: string;
  valueColor?: string;
  trailing?: React.ReactNode;
  footer?: React.ReactNode;
  decorative?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-surface border border-line rounded-2xl p-5 shadow-card overflow-hidden"
    >
      {decorative}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>{icon}</div>
          <p className="font-display text-3xl font-bold tabular-nums" style={{ color: valueColor ?? 'var(--ink)' }}>
            {value}
          </p>
          <p className="text-sm font-medium text-ink mt-1">{label}</p>
          <p className="text-xs text-faint">{sublabel}</p>
        </div>
        {trailing}
      </div>
      {footer}
    </motion.div>
  );
}
