import { CATEGORIES } from './constants';
import { CategoryIcon } from './landingSvgs';

export function Categories() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="center head-c reveal">
          <span className="eyebrow">Detailed analytics</span>
          <h2 className="sec-h">7 categories • 100 points</h2>
          <p className="sub">
            Each dimension maps to signals AI search engines weigh when reading, trusting, and citing your site.
          </p>
        </div>
        <div className="cat-layout">
          <div className="total-card reveal">
            <div className="lbl">Total Score</div>
            <div className="big">100</div>
            <p>A single readiness number your team, clients, and stakeholders can understand instantly.</p>
            <div className="meta">
              <div className="m">
                <div className="n">7</div>
                <div className="t">Categories</div>
              </div>
              <div className="m">
                <div className="n">0–15</div>
                <div className="t">Points each</div>
              </div>
            </div>
          </div>
          {CATEGORIES.map((c) => (
            <div key={c.label} className="cat reveal" data-w={c.width}>
              <div className="top">
                <span className="ic">
                  <CategoryIcon type={c.icon} />
                </span>
                <span className="sc" style={{ color: c.color }}>
                  {c.score}
                </span>
              </div>
              <h4>{c.label}</h4>
              <div className="d">{c.desc}</div>
              <div className="bar">
                <i style={{ background: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
