import { STEPS } from './constants';
import { StepIcon } from './landingSvgs';

export function Steps() {
  return (
    <section className="section steps-sec" id="how">
      <div className="wrap">
        <div className="center head-c reveal">
          <span className="eyebrow">Take action</span>
          <h2 className="sec-h">From URL to fix list in 3 simple steps</h2>
          <p className="sub">No plugins. No black-box AI scoring. Just a deterministic audit with actionable output.</p>
        </div>
        <div className="steps">
          <div className="connector" style={{ left: '33%', width: '34%' }} />
          {STEPS.map((s) => (
            <div key={s.n} className="step reveal">
              <span className="n">{s.n}</span>
              <div className="si">
                <StepIcon type={s.icon} />
              </div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
