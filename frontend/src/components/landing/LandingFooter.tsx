import { Link } from 'react-router-dom';
import { PRODUCT_NAME } from './constants';
import { LogoMark } from './landingIcons';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#why' },
      { label: 'How it works', href: '#how' },
      { label: 'Scans', href: '#scans' },
      { label: 'Pricing', href: '#scans' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Guides', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link className="logo" to="/">
              <span className="mk">
                <LogoMark />
              </span>
              {PRODUCT_NAME}
            </Link>
            <p>Audit how AI search engines read, trust, and cite your website — with fixes you can ship today.</p>
            <div className="socials">
              <a href="#" aria-label="X">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM6 9H2v12h4zM4 6a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" fill="#080B14" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="#080B14" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M21.58 7.19a2.5 2.5 0 00-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 002.42 7.2 26 26 0 002 12a26 26 0 00.42 4.81 2.5 2.5 0 001.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 001.76-1.77A26 26 0 0022 12a26 26 0 00-.42-4.81zM10 15V9l5 3z" />
                </svg>
              </a>
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title} className="fcol">
              <h5>{col.title}</h5>
              {col.links.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.</span>
          <span>
            Made with <span className="heart">♥</span> for the AI era
          </span>
        </div>
      </div>
    </footer>
  );
}
