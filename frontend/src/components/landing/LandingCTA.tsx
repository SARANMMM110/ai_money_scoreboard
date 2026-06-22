import { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ScanBox } from './LandingNav';

export function LandingCTA({
  url,
  setUrl,
  onSubmit,
  user,
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  user: boolean;
}) {
  return (
    <section className="cta-sec">
      <div className="wrap">
        <div className="cta reveal">
          <div className="glow" />
          <div className="dots" />
          <h2>See your AI readiness score</h2>
          <p>Run your first scan in under two minutes. No plugins. No guesswork.</p>
          <ScanBox url={url} setUrl={setUrl} onSubmit={onSubmit} buttonLabel="Run free scan" />
          <div className="signin-note">
            {user ? (
              <>
                Go to your <Link to="/app">dashboard</Link>
              </>
            ) : (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
