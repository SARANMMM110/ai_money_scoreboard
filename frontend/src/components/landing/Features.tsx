import { FEATURES } from './constants';
import { FeatureIcon } from './landingSvgs';

export function Features() {
  return (
    <section className="section" id="why">
      <div className="wrap">
        <div className="center head-c reveal">
          <span className="eyebrow">Why it matters</span>
          <h2 className="sec-h">Everything you need to win AI search</h2>
          <p className="sub">
            From technical foundations to content clarity — we scan, prioritize and deliver actionable fixes that help AI understand and cite you.
          </p>
        </div>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="card reveal">
              <div className={`icon-chip ${f.chip}`}>
                <FeatureIcon type={f.icon} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
