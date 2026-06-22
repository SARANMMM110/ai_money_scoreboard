import { Link } from 'react-router-dom';
import { SCAN_FEATURES } from './constants';

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function FeatureCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const HIGHLIGHTS = [
  { label: '7 categories', value: 'Full audit' },
  { label: '100 points', value: 'Verified score' },
  { label: 'PDF export', value: 'Shareable report' },
];

export function ScanTiers() {
  return (
    <section className="section scan-section" id="scans">
      <div className="wrap">
        <div className="center head-c reveal">
          <span className="eyebrow">One scan, full confidence</span>
          <h2 className="sec-h">Full-site AI readiness audit</h2>
          <p className="sub scan-section__sub">
            Crawl up to 20 pages, validate signals, and get a reproducible score with step-by-step fixes.
          </p>
        </div>

        <div className="scan-showcase reveal">
          <div className="scan-showcase__glow" aria-hidden />

          <article className="scan-card">
            <span className="scan-card__badge">Verified</span>

            <header className="scan-card__head">
              <div className="scan-card__icon">
                <ShieldIcon />
              </div>
              <div className="scan-card__title-block">
                <span className="scan-card__num">01</span>
                <h3 className="scan-card__title">Site Scan</h3>
              </div>
            </header>

            <p className="scan-card__meta">~3–5 minutes · No API key required</p>
            <p className="scan-card__desc">
              Deterministic 7-category audit with extended crawl, schema validation, and internal linking analysis.
            </p>

            <ul className="scan-card__features">
              {SCAN_FEATURES.map((feature) => (
                <li key={feature}>
                  <span className="scan-card__check" aria-hidden>
                    <FeatureCheck />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="scan-card__highlights">
              {HIGHLIGHTS.map((item) => (
                <div key={item.label} className="scan-card__highlight">
                  <span className="scan-card__highlight-label">{item.label}</span>
                  <span className="scan-card__highlight-value">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="scan-card__cta">
              <Link to="/register" className="btn btn-primary scan-card__btn">
                Run your first scan
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <p className="scan-card__note">Free to start · No credit card · Results in minutes</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
