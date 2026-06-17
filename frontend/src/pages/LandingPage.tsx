import { Link } from 'react-router-dom';
import { ReadinessGauge } from '../components/ReadinessGauge';
import { CATEGORIES } from '../types';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display text-xl font-semibold tracking-tight">
            AI Money<span className="text-brand">.</span>
          </span>
          <div className="flex gap-3">
            <Link to="/login" className="text-sm text-text-dim hover:text-text px-4 py-2 transition-colors">
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-brand text-bg font-medium px-4 py-2 rounded-lg hover:bg-brand-deep transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-6">
              Is your website ready for the{' '}
              <span className="text-brand">AI search</span> revolution?
            </h1>
            <p className="text-text-dim text-lg mb-8 max-w-lg">
              Audit how well ChatGPT Search, Google AI Overviews, Perplexity, Copilot, and Gemini can read, trust, and cite your site.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-brand text-bg font-semibold px-6 py-3 rounded-lg hover:bg-brand-deep transition-colors"
            >
              Run a free scan
            </Link>
          </div>
          <div className="flex justify-center">
            <ReadinessGauge mode="demo" size={340} />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface/50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-display text-xl font-semibold mb-8 text-center">7 categories we analyze</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="bg-surface-2 border border-line rounded-lg p-4 text-center">
                <p className="text-xs text-text-dim mb-1">{cat.label}</p>
                <p className="font-mono text-sm text-brand tabular-nums">{cat.max} pts</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display text-xl font-semibold mb-10 text-center">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Enter your URL', desc: 'We validate and reach your site server-side — no browser plugins needed.' },
            { step: '02', title: 'We crawl & analyze', desc: 'Seven weighted analyzers inspect schema, E-E-A-T, content, technical SEO, and more.' },
            { step: '03', title: 'Get your score', desc: 'A reproducible AI Money Score with issues, recommendations, and a PDF report.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="font-mono text-brand text-sm mb-3">{item.step}</div>
              <h3 className="font-medium text-text mb-2">{item.title}</h3>
              <p className="text-sm text-text-dim">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-text-faint text-sm">© {new Date().getFullYear()} AI Money Scoreboard</span>
          <Link to="/register" className="text-sm text-brand hover:text-brand-deep transition-colors">
            Start scanning →
          </Link>
        </div>
      </footer>
    </div>
  );
}
