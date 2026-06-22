import { motion } from 'framer-motion';
import { PRODUCT_NAME } from './BrandLogo';
import { CATEGORIES } from '../types';
import { IconClock, IconShield, IconSearch } from './icons';

const STEPS = [
  { n: '01', title: 'Crawl your site', desc: 'Server-side fetch with Playwright fallback' },
  { n: '02', title: 'Run 7 analyzers', desc: 'Schema, E-E-A-T, FAQ, content, technical & more' },
  { n: '03', title: 'Get fixes + code', desc: 'Reproducible score with paste-ready snippets' },
];

export function ScanAnalyzerPanel() {
  return (
    <div className="space-y-5">
      <div className="bg-surface border border-line rounded-2xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-soft flex items-center justify-center text-brand">
            <IconSearch size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">7 analyzers</h3>
            <p className="text-xs text-faint">{PRODUCT_NAME} weighted score</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="flex items-center justify-between bg-surface-2 border border-line rounded-xl px-3 py-2.5"
            >
              <span className="text-xs text-dim truncate pr-1">{cat.label}</span>
              <span className="text-[10px] font-mono font-semibold text-brand shrink-0">{cat.max}pt</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl shadow-card p-6">
        <h3 className="text-sm font-semibold text-ink mb-4">How it works</h3>
        <div className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-3">
              <span className="font-mono text-xs text-brand font-semibold shrink-0 mt-0.5">{step.n}</span>
              <div>
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="text-xs text-faint mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-brand-soft/60 border border-brand/15 rounded-2xl p-4 flex items-center gap-3">
          <IconClock size={18} className="text-brand shrink-0" />
          <div>
            <p className="text-xs font-semibold text-brand">~2–3 min</p>
            <p className="text-[11px] text-dim">Typical scan time</p>
          </div>
        </div>
        <div className="flex-1 bg-surface border border-line rounded-2xl p-4 flex items-center gap-3 shadow-card">
          <IconShield size={18} className="text-brand shrink-0" />
          <div>
            <p className="text-xs font-semibold text-ink">Reproducible</p>
            <p className="text-[11px] text-faint">Cached rescans</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScanPageDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_top_right,rgba(14,169,141,0.14)_0%,transparent_65%)]" />
      <div className="absolute bottom-0 left-[20%] w-[500px] h-[300px] bg-[radial-gradient(ellipse_at_bottom,rgba(124,108,240,0.08)_0%,transparent_70%)]" />

      <svg className="absolute top-12 right-[15%] w-64 h-64 opacity-[0.12]" viewBox="0 0 260 260" fill="none">
        {[40, 65, 90, 115].map((r) => (
          <circle key={r} cx="130" cy="130" r={r} stroke="#0EA98D" strokeWidth="1" />
        ))}
      </svg>

      <motion.div
        className="absolute top-24 right-[22%] w-3 h-3 rounded-full bg-brand/40"
        animate={{ y: [0, -8, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
