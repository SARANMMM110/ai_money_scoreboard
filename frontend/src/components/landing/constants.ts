import { PRODUCT_NAME } from '../BrandLogo';

export { PRODUCT_NAME };

export const FEATURES = [
  {
    chip: 'c-teal' as const,
    title: 'Deterministic scoring',
    desc: 'Same URL, same scan every time. Reproducible audits you can benchmark and track consistently.',
    icon: 'target' as const,
  },
  {
    chip: 'c-violet' as const,
    title: 'Paste-ready fixes',
    desc: 'Step-by-step instructions with copy-paste code for schema, meta tags, linking, & more.',
    icon: 'code' as const,
  },
  {
    chip: 'c-amber' as const,
    title: 'Quick wins first',
    desc: 'High-impact fixes that move the needle. See results faster, ship with confidence.',
    icon: 'bolt' as const,
  },
  {
    chip: 'c-blue' as const,
    title: 'Client-ready PDFs',
    desc: 'Download polished reports to share with clients — no extra work.',
    icon: 'doc' as const,
  },
];

export const CATEGORIES = [
  { label: 'Schema Markup', desc: 'Structured data & validation', score: '0/15', color: 'var(--crit)', width: 0, icon: 'lines' as const },
  { label: 'E-E-A-T', desc: 'Experience, expertise & trust', score: '6/15', color: 'var(--caut)', width: 40, icon: 'star' as const },
  { label: 'FAQ Coverage', desc: 'AI-friendly answers to key questions', score: '5/15', color: 'var(--crit)', width: 33, icon: 'faq' as const },
  { label: 'Content Depth', desc: 'Depth, freshness & topical coverage', score: '6/15', color: 'var(--caut)', width: 40, icon: 'content' as const },
  { label: 'Technical SEO', desc: 'Crawlability & technical health', score: '6/15', color: 'var(--caut)', width: 40, icon: 'link' as const },
  { label: 'Authority Signals', desc: 'Mentions, backlinks & reputation', score: '1/15', color: 'var(--crit)', width: 7, icon: 'shield' as const },
  { label: 'AI Accessibility', desc: 'How easily AI can read your content', score: '7/15', color: 'var(--good)', width: 70, icon: 'ai' as const },
];

export const STEPS = [
  { n: '01', title: 'Paste your URL', desc: 'We validate, normalize, and crawl your site to collect key signals.', icon: 'link' as const },
  { n: '02', title: 'Live 7-point audit', desc: 'We check what matters across the 7 AI readiness areas and score them in real time.', icon: 'clock' as const },
  { n: '03', title: 'Ship the fixes', desc: 'Get a prioritized, practical fix list with code, examples, and expected impact.', icon: 'check' as const },
];

export const ISSUE_PERKS = [
  'Missing schema markup on key pages',
  'Category breakdown across all 7 areas',
  'Downloadable PDF for clients & stakeholders',
  'Track history to prove improvement over time',
];

export const SCHEMA_SNIPPET = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand",
  "url": "https://yoursite.com",
  "logo": "https://yoursite.com/logo.png"
}
</script>`;

export const SCAN_FEATURES = [
  'Extended crawl (up to 20 pages)',
  'Server-side crawl & signal validation',
  'Reproducible 100-pt verified score',
  'Step-by-step remediation & PDF report',
  'Per-page schema & orphan page detection',
];

export const FLASH_FEATURES = [
  'Server-side crawl & analysis',
  'Reproducible 100-pt score',
  'Step-by-step remediation',
  'PDF report download',
];

export const DEEP_FEATURES = [
  'Extended crawl (up to 21 pages)',
  'Per-page schema & content audit',
  'Internal linking & orphan detection',
  'Live AI visibility report (API keys)',
];
