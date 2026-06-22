import type { BrandContext, GapRecommendation } from './types.js';

const KNOWN_SOURCE_PATTERNS: { pattern: RegExp; label: string; action: string }[] = [
  {
    pattern: /reddit\.com/i,
    label: 'Reddit',
    action: 'Participate in relevant subreddit threads and share expertise — Reddit is heavily cited by Perplexity and ChatGPT.',
  },
  {
    pattern: /wikipedia\.org/i,
    label: 'Wikipedia',
    action: 'Establish notability and pursue a Wikipedia article or improve existing coverage with cited sources.',
  },
  {
    pattern: /youtube\.com/i,
    label: 'YouTube',
    action: 'Publish explainer and comparison videos — AI engines frequently cite YouTube for how-to and review queries.',
  },
  {
    pattern: /g2\.com/i,
    label: 'G2',
    action: 'Claim your G2 profile and collect verified reviews — comparison queries often pull from G2.',
  },
  {
    pattern: /capterra\.com/i,
    label: 'Capterra',
    action: 'List your product on Capterra and encourage customer reviews.',
  },
  {
    pattern: /trustpilot\.com/i,
    label: 'Trustpilot',
    action: 'Build a Trustpilot presence with authentic customer reviews.',
  },
  {
    pattern: /linkedin\.com/i,
    label: 'LinkedIn',
    action: 'Maintain an active company page and thought-leadership posts.',
  },
];

function brandOnDomain(domain: string, brandDomain: string | null, brandName: string): boolean {
  const host = domain.toLowerCase();
  if (brandDomain) {
    const normalized = brandDomain.replace(/^www\./, '').toLowerCase();
    if (host.includes(normalized)) return true;
  }
  if (brandName && host.includes(brandName.toLowerCase().replace(/\s+/g, ''))) return true;
  return false;
}

export function buildGapRecommendations(
  citedDomains: { domain: string; count: number }[],
  brand: BrandContext,
): GapRecommendation[] {
  const recs: GapRecommendation[] = [];
  const top = citedDomains.slice(0, 15);

  for (const { domain, count } of top) {
    const known = KNOWN_SOURCE_PATTERNS.find((k) => k.pattern.test(domain));
    const hasPresence = brandOnDomain(domain, brand.domain, brand.name);
    if (hasPresence) continue;

    recs.push({
      domain: known?.label ?? domain,
      citationCount: count,
      brandHasPresence: false,
      priority: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
      action:
        known?.action ??
        `AI engines cite ${domain} frequently for ${brand.category ?? 'your category'} — build authoritative content or listings there.`,
    });
  }

  return recs.slice(0, 8);
}
