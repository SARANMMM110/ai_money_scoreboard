import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCT_NAME } from './constants';
import { BurgerIcon, LogoMark } from './landingIcons';

const LINKS = [
  { href: '#why', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#scans', label: 'Scans' },
  { href: '#scans', label: 'Pricing' },
];

export function LandingNav({ user }: { user: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav" id="lp-nav">
      <div className="wrap nav-in">
        <Link className="logo" to="/">
          <span className="mk">
            <LogoMark />
          </span>
          {PRODUCT_NAME}
        </Link>

        <div className="nav-links">
          {LINKS.map((l) => (
            <a key={l.label} href={l.href}>
              {l.label}
            </a>
          ))}
          <span>Resources ▾</span>
        </div>

        <div className="nav-right">
          {user ? (
            <Link to="/app" className="btn btn-primary nav-cta">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="signin">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary nav-cta">
                Get started
              </Link>
            </>
          )}
          <button type="button" className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <BurgerIcon />
          </button>
        </div>
      </div>

      <div className={`mobile-menu${open ? ' open' : ''}`}>
        {LINKS.map((l) => (
          <a key={l.label} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a href="#">Resources</a>
        {user ? (
          <Link to="/app" onClick={() => setOpen(false)}>
            Dashboard
          </Link>
        ) : (
          <>
            <Link to="/login" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link to="/register" onClick={() => setOpen(false)}>
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export function ScanBox({
  url,
  setUrl,
  onSubmit,
  buttonLabel = 'Run free scan →',
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  buttonLabel?: string;
}) {
  return (
    <form className="scanbox" onSubmit={onSubmit}>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://yoursite.com"
        aria-label="Website URL"
        required
      />
      <button type="submit" className="btn btn-primary">
        {buttonLabel}
      </button>
    </form>
  );
}
