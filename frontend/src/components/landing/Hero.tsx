import { FormEvent } from 'react';
import { ScanBox } from './LandingNav';

export function Hero({
  url,
  setUrl,
  onSubmit,
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <header className="hero">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="dots" />
      <div id="lp-particles" />

      <div className="wrap hero-grid">
        <div>
          <span className="pill">
            <span className="dot" />
            AI Search Readiness Audit
          </span>
          <h1 className="hero-h">
            Is your site ready
            <br />
            for <span className="grad-text">AI search?</span>
          </h1>
          <p className="lead">
            AI Money Scorecard shows how well AI engines can read, trust, and cite your content — with a reproducible score and real fixes, not vague SEO advice.
          </p>
          <ScanBox url={url} setUrl={setUrl} onSubmit={onSubmit} />

          <div className="feat-pills">
            <span className="fp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              7 Categories
            </span>
            <span className="fp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              100 Point Scale
            </span>
            <span className="fp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
              </svg>
              2 Min Scan
            </span>
            <span className="fp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Free Forever
            </span>
          </div>
        </div>

        <div className="scard" id="lp-scard">
          <div className="scard-top">
            <span className="site">
              <span className="pulse" />
              yoursite.com
            </span>
            <span>1m ago</span>
          </div>
          <div className="gauge-wrap">
            <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden>
              <defs>
                <linearGradient id="lp-gg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0EA98D" />
                  <stop offset="1" stopColor="#34D399" />
                </linearGradient>
              </defs>
              <circle cx="110" cy="110" r="92" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="14" />
              <circle
                id="lp-arc"
                cx="110"
                cy="110"
                r="92"
                fill="none"
                stroke="url(#lp-gg)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="578"
                strokeDashoffset="578"
              />
            </svg>
            <div className="gauge-center">
              <div className="num" id="lp-gnum">
                0
              </div>
              <div className="den">/ 100</div>
              <div className="tag">⚡ Strong Readiness</div>
            </div>
          </div>
          <div className="scard-stats">
            <div className="st">
              <div className="v">9</div>
              <div className="l">Quick wins</div>
            </div>
            <div className="st">
              <div className="v">14</div>
              <div className="l">Issues</div>
            </div>
            <div className="st">
              <div className="v up">+18</div>
              <div className="l">vs last scan</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
