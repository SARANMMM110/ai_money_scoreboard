import type { CategoryResult, RawIssue } from './types.js';
import type { ExtractedSignals } from './extractor.js';
import type { CrawlResult } from './types.js';

type AnalyzerFn = (signals: ExtractedSignals, crawl: CrawlResult) => CategoryResult;

function isVerified(signals: ExtractedSignals): boolean {
  return signals.scope === 'verified';
}

function siteHtml(crawl: CrawlResult, signals: ExtractedSignals): string {
  const main = crawl.mainPage.html.toLowerCase();
  if (!isVerified(signals)) return main;
  return main + crawl.internalPages.map((p) => p.html).join('').toLowerCase();
}

function raw(
  issueId: string,
  category: RawIssue['category'],
  description: string,
  priority: RawIssue['priority'],
): RawIssue {
  return { issueId, category, description, priority };
}

const SCHEMA_TYPES: Record<string, number> = {
  Organization: 3,
  WebSite: 3,
  FAQPage: 3,
  Article: 2,
  BlogPosting: 2,
  BreadcrumbList: 2,
  LocalBusiness: 3,
  Product: 2,
  Review: 2,
};

export const analyzeSchema: AnalyzerFn = (signals) => {
  const issues: RawIssue[] = [];
  const rawSignals: Record<string, unknown> = { typesFound: [], pointsAwarded: {}, parseErrors: 0 };
  let score = 0;
  const verified = isVerified(signals);

  const types = verified ? signals.deep!.aggregatedJsonLdTypes : signals.jsonLdTypes;

  if (verified) {
    const parseErrors = signals.deep!.schemaParseErrors;
    if (parseErrors > 0) {
      issues.push(raw('invalid-structured-data', 'schema', `${parseErrors} JSON-LD block(s) failed to parse or validate.`, 'high'));
      rawSignals.parseErrors = parseErrors;
      score -= Math.min(3, parseErrors);
    }

    if (signals.deep!.schemaMissingRequired.length > 0) {
      issues.push(
        raw(
          'schema-missing-required',
          'schema',
          `Schema missing required properties: ${signals.deep!.schemaMissingRequired.slice(0, 3).join(', ')}.`,
          'medium',
        ),
      );
      rawSignals.missingRequired = signals.deep!.schemaMissingRequired;
      score -= Math.min(2, signals.deep!.schemaMissingRequired.length);
    }
  } else if (signals.jsonLdBlocks.length > 0) {
    // Flash: presence-only — any JSON-LD block on homepage counts as detected.
    score += 3;
    rawSignals.presenceOnly = true;
  }

  const awarded = new Set<string>();
  for (const type of types) {
    const pts = SCHEMA_TYPES[type];
    if (pts && !awarded.has(type)) {
      score += pts;
      awarded.add(type);
      (rawSignals.pointsAwarded as Record<string, number>)[type] = pts;
    }
  }
  rawSignals.typesFound = types;
  rawSignals.verified = verified;
  score = Math.max(0, Math.min(15, score));

  if (verified && signals.deep!.pagesMissingSchema > 0) {
    const ratio = signals.deep!.pagesMissingSchema / Math.max(1, signals.deep!.pagesCrawled);
    if (ratio >= 0.5) {
      score = Math.max(0, score - 2);
      issues.push(
        raw(
          'site-wide-schema-gaps',
          'schema',
          `${signals.deep!.pagesMissingSchema} of ${signals.deep!.pagesCrawled} crawled pages lack structured data.`,
          'high',
        ),
      );
    }
  }

  if (score < 3 && !verified) {
    issues.push(raw('missing-schema', 'schema', 'No structured data detected on homepage (quick check).', 'high'));
  } else if (score < 3) {
    issues.push(raw('missing-schema', 'schema', 'No structured data detected on this page.', 'high'));
  }
  if (!types.includes('FAQPage') && score < 15 && verified) {
    issues.push(raw('no-faq-schema', 'schema', 'FAQPage structured data not found.', 'medium'));
  }

  return { category: 'schema', score, maxScore: 15, rawSignals, issues };
};

export const analyzeEeat: AnalyzerFn = (signals, crawl) => {
  const issues: RawIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;
  const verified = isVerified(signals);

  const allLinks = signals.links;
  const allHtml = siteHtml(crawl, signals);

  const hasAbout = allLinks.some(
    (l) => l.href.includes('/about') || l.text.includes('about us') || l.text === 'about',
  ) || allHtml.includes('/about');
  if (hasAbout) { score += 3; rawSignals.aboutPage = true; }
  else issues.push(raw('no-about-page', 'eeat', verified ? 'No about page found across crawled site.' : 'No link to an about page detected on homepage.', 'medium'));

  const contact = verified && signals.deep ? signals.deep.siteContactSignals : signals.contactSignals;
  if (contact.length > 0) { score += 3; rawSignals.contact = contact; }
  else issues.push(raw('missing-contact-info', 'eeat', 'No email, phone, or address found.', 'high'));

  const author = verified && signals.deep ? signals.deep.siteAuthorSignals : signals.authorSignals;
  if (author.length > 0) { score += 3; rawSignals.author = author; }
  else issues.push(raw('no-author', 'eeat', 'No author byline or Person schema detected.', 'medium'));

  const hasTrustPages = allLinks.some((l) => l.href.includes('privacy') || l.href.includes('terms'));
  const hasTrustPhrases = signals.trustPhrases.length > 0;
  if (hasTrustPages || hasTrustPhrases) { score += 2; rawSignals.trust = { pages: hasTrustPages, phrases: signals.trustPhrases }; }

  const hasTestimonials = allHtml.includes('testimonial') || allHtml.includes('review') || signals.reviewLinks.length > 0;
  if (hasTestimonials) { score += 2; rawSignals.testimonials = true; }

  const authDomains = ['.gov', '.edu', 'wikipedia.org', 'scholar.google'];
  const hasOutboundAuth = signals.links.some((l) => authDomains.some((d) => l.href.includes(d)));
  if (hasOutboundAuth) { score += 2; rawSignals.authoritativeLinks = true; }

  score = Math.min(15, score);
  return { category: 'eeat', score, maxScore: 15, rawSignals, issues };
};

export const analyzeFaq: AnalyzerFn = (signals, crawl) => {
  const issues: RawIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;
  const verified = isVerified(signals);
  const types = verified ? signals.deep!.aggregatedJsonLdTypes : signals.jsonLdTypes;

  if (types.includes('FAQPage') || (verified && signals.deep!.faqSchemaOnInnerPages)) {
    score += 6;
    rawSignals.faqSchema = true;
    if (verified && signals.deep!.faqSchemaOnInnerPages) rawSignals.faqOnInnerPages = true;
  } else if (verified) {
    issues.push(raw('no-faq-schema', 'faq', 'FAQPage structured data not present.', 'high'));
  }

  const questionCount = signals.questionHeadings.length;
  rawSignals.questionHeadings = questionCount;
  if (verified) {
    if (questionCount >= 3) score += 5;
    else if (questionCount > 0) {
      score += 2;
      issues.push(raw('few-question-headings', 'faq', `Only ${questionCount} question-style heading(s) found.`, 'medium'));
    } else {
      issues.push(raw('no-question-headings', 'faq', 'Headings are not phrased as questions.', 'medium'));
    }
  } else {
    // Flash: generous — any question-style heading counts.
    if (questionCount >= 2) score += 5;
    else if (questionCount >= 1) score += 3;
  }

  const allLinks = signals.links;
  const allHtml = crawl.mainPage.html.toLowerCase();
  const hasFaqPage = allLinks.some((l) => l.href.includes('/faq')) || allHtml.includes('accordion') || allHtml.includes('faq-item');
  if (hasFaqPage) { score += 4; rawSignals.faqPage = true; }
  else if (verified) issues.push(raw('no-faq-section', 'faq', 'No /faq page or accordion Q&A pattern found.', 'medium'));
  else if (allLinks.some((l) => l.href.includes('/faq') || l.text.includes('faq'))) {
    score += 2;
    rawSignals.faqLinkHint = true;
  }

  score = Math.min(15, score);
  return { category: 'faq', score, maxScore: 15, rawSignals, issues };
};

export const analyzeContent: AnalyzerFn = (signals) => {
  const issues: RawIssue[] = [];
  const verified = isVerified(signals);
  const wc = verified ? signals.deep!.avgWordCountAcrossPages : signals.wordCount;
  const rawSignals: Record<string, unknown> = { wordCount: wc, verified };
  let score = 0;

  if (verified) {
    if (wc >= 2000) score += 9;
    else if (wc >= 1200) score += 9;
    else if (wc >= 600) score += 6;
    else if (wc >= 300) score += 3;
    else issues.push(raw('thin-content', 'content', `Site avg ${wc} words per crawled page.`, 'high'));
  } else {
    // Flash: homepage-only with lenient thresholds (quick estimate).
    if (wc >= 1200) score += 9;
    else if (wc >= 600) score += 6;
    else if (wc >= 200) score += 3;
    else if (wc >= 50) score += 1;
    else issues.push(raw('thin-content', 'content', `Homepage has only ${wc} words.`, 'high'));
  }

  const levels = signals.headings.map((h) => h.level);
  const hasH1 = levels.includes(1);
  const ordered = hasH1 && levels.every((l, i) => i === 0 || l <= levels[i - 1]! + 1);
  if (ordered && signals.headings.length >= 2) { score += 3; rawSignals.headingHierarchy = true; }
  else issues.push(raw('weak-heading-hierarchy', 'content', 'Heading structure is missing or out of order.', 'medium'));

  const internalLinks = verified
    ? signals.deep!.totalInternalLinks
    : signals.links.filter((l) => !l.href.startsWith('http') || l.href.includes(new URL(signals.canonicalUrl || 'https://x.com').hostname)).length;
  rawSignals.internalLinks = internalLinks;
  if (internalLinks >= 5) score += 3;
  else if (internalLinks >= 2) score += 1;
  else issues.push(raw('few-internal-links', 'content', 'Limited internal linking detected.', 'low'));

  if (verified && signals.deep!.orphanPageCount > 0) {
    issues.push(
      raw(
        'orphan-pages',
        'content',
        `${signals.deep!.orphanPageCount} crawled page(s) have no inbound internal links.`,
        'medium',
      ),
    );
    rawSignals.orphanPages = signals.deep!.orphanPageCount;
  }

  if (verified && signals.deep!.thinPages > 0) {
    issues.push(
      raw(
        'thin-pages-site-wide',
        'content',
        `${signals.deep!.thinPages} crawled page(s) have fewer than 300 words.`,
        'medium',
      ),
    );
    if (signals.deep!.thinPages >= 3) score = Math.max(0, score - 2);
  }

  score = Math.min(15, score);
  return { category: 'content', score, maxScore: 15, rawSignals, issues };
};

export const analyzeTechnical: AnalyzerFn = (signals, crawl) => {
  const issues: RawIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  const titleLen = signals.title.length;
  const verified = isVerified(signals);

  if (signals.title && titleLen >= 30 && titleLen <= 60) {
    score += 2;
    rawSignals.title = { length: titleLen, ok: true };
  } else if (signals.title && !verified) {
    score += 1;
    rawSignals.title = { length: titleLen, ok: 'estimate' };
  } else {
    issues.push(
      raw('title-tag-issue', 'technical', signals.title ? `Title is ${titleLen} characters (ideal: 30–60).` : 'No title tag found.', signals.title ? 'medium' : 'high'),
    );
    if (signals.title) rawSignals.title = { length: titleLen, ok: false };
  }

  const descLen = signals.metaDescription.length;
  if (signals.metaDescription && descLen >= 120 && descLen <= 160) {
    score += 2;
    rawSignals.metaDescription = { length: descLen, ok: true };
  } else if (signals.metaDescription && !verified) {
    score += 1;
    rawSignals.metaDescription = { length: descLen, ok: 'estimate' };
  } else if (!signals.metaDescription) {
    issues.push(raw('missing-meta-description', 'technical', 'Missing meta description.', 'medium'));
  } else {
    issues.push(raw('meta-description-length', 'technical', `Description is ${descLen} chars (ideal: 120–160).`, 'medium'));
  }

  if (signals.h1s.length === 1) {
    score += 2;
    rawSignals.h1Count = 1;
  } else if (signals.h1s.length === 0) {
    issues.push(raw('no-h1', 'technical', 'No H1 tag found.', 'medium'));
    rawSignals.h1Count = 0;
  } else {
    issues.push(raw('multiple-h1', 'technical', `${signals.h1s.length} H1 tags found (should be exactly 1).`, 'medium'));
    rawSignals.h1Count = signals.h1s.length;
  }

  if (crawl.sitemapXml) { score += 2; rawSignals.sitemap = true; }
  else issues.push(raw('no-sitemap', 'technical', '/sitemap.xml not reachable.', 'medium'));

  if (crawl.robotsTxt) {
    const blocks = crawl.robotsTxt.toLowerCase().includes('disallow: /');
    if (!blocks) { score += 1; rawSignals.robotsTxt = true; }
    else if (verified) issues.push(raw('robots-blocking', 'technical', 'robots.txt may block crawlers.', 'high'));
  } else if (verified) {
    issues.push(raw('no-robots-txt', 'technical', 'robots.txt not found.', 'low'));
  }

  if (signals.deep?.anyAiBotBlocked) {
    const blocked = Object.entries(signals.deep.aiBotBlocked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    issues.push(
      raw(
        'ai-bot-blocked',
        'technical',
        `robots.txt blocks AI crawlers: ${blocked.join(', ')}.`,
        'high',
      ),
    );
    rawSignals.aiBotBlocked = blocked;
    score = Math.max(0, score - Math.min(2, blocked.length));
  }

  const withAlt = signals.images.filter((i) => i.alt.trim().length > 0).length;
  const altPct = signals.images.length > 0 ? (withAlt / signals.images.length) * 100 : 100;
  rawSignals.altCoverage = altPct;
  if (altPct >= 80) score += 2;
  else {
    issues.push(raw('missing-alt-text', 'technical', `${Math.round(altPct)}% of images have alt text.`, 'medium'));
    if (altPct >= 50) score += 1;
  }

  if (signals.hasViewport) { score += 2; rawSignals.viewport = true; }
  else issues.push(raw('no-viewport-meta', 'technical', 'Mobile viewport meta tag missing.', 'low'));

  if (signals.hasCanonical) { score += 2; rawSignals.canonical = signals.canonicalUrl; }
  else issues.push(raw('no-canonical-tag', 'technical', 'Canonical URL not specified.', 'medium'));

  score = Math.min(15, score);
  return { category: 'technical', score, maxScore: 15, rawSignals, issues };
};

export const analyzeAuthority: AnalyzerFn = (signals, crawl) => {
  const issues: RawIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  const socialCount = Math.min(signals.socialLinks.length, 5);
  score += Math.min(5, socialCount);
  rawSignals.socialLinks = signals.socialLinks;
  if (socialCount === 0) issues.push(raw('no-social-profiles', 'authority', 'No social media links detected.', 'medium'));

  if (signals.reviewLinks.length > 0) { score += 3; rawSignals.reviewLinks = signals.reviewLinks; }
  else issues.push(raw('no-review-links', 'authority', 'No Trustpilot, G2, or similar links found.', 'low'));

  const hasNAP = signals.contactSignals.includes('phone-pattern') || signals.contactSignals.includes('telephone');
  const hasAddress = signals.contactSignals.includes('address');
  if (hasNAP && hasAddress) { score += 3; rawSignals.nap = true; }
  else if (hasNAP || hasAddress) { score += 1; rawSignals.nap = 'partial'; }

  const allText = crawl.mainPage.html.toLowerCase();
  const hasPress = allText.includes('featured in') || allText.includes('as seen in') || allText.includes('press');
  if (hasPress || signals.trustPhrases.length > 0) { score += 2; rawSignals.press = true; }

  const title = signals.title.toLowerCase();
  const h1 = signals.h1s[0]?.toLowerCase() ?? '';
  if (title && h1 && (title.includes(h1.slice(0, 10)) || h1.includes(title.slice(0, 10)))) {
    score += 2;
    rawSignals.brandConsistency = true;
  }

  score = Math.min(15, score);
  return { category: 'authority', score, maxScore: 15, rawSignals, issues };
};

export const analyzeAiAccessibility: AnalyzerFn = (signals, crawl) => {
  const issues: RawIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  const semanticCount = signals.semanticTags.length;
  if (semanticCount >= 4) { score += 3; rawSignals.semanticTags = signals.semanticTags; }
  else if (semanticCount >= 2) { score += 2; rawSignals.semanticTags = signals.semanticTags; }
  else issues.push(raw('missing-semantic-html', 'ai_accessibility', 'Few HTML5 semantic elements detected.', 'medium'));

  if (signals.contentToCodeRatio >= 0.05) { score += 2; rawSignals.contentToCodeRatio = signals.contentToCodeRatio; }
  else issues.push(raw('low-content-ratio', 'ai_accessibility', 'Page has excessive markup relative to content.', 'medium'));

  const staticWords = signals.staticBodyText.split(/\s+/).filter(Boolean).length;
  rawSignals.staticWordCount = staticWords;
  if (staticWords >= 200 && !signals.usedPlaywright) { score += 3; rawSignals.staticContent = true; }
  else if (signals.usedPlaywright) {
    issues.push(raw('js-gated-content', 'ai_accessibility', 'Primary content requires JavaScript to render.', 'high'));
    if (staticWords >= 50) score += 1;
  } else {
    issues.push(raw('empty-static-html', 'ai_accessibility', 'Little content available without JavaScript.', 'high'));
  }

  if (crawl.llmsTxt) { score += 1; rawSignals.llmsTxt = true; }
  else issues.push(raw('no-llms-txt', 'ai_accessibility', 'llms.txt file not found.', 'low'));

  const hasGoodHeadings = signals.headings.length >= 2;
  const altOk = signals.images.length === 0 || signals.images.filter((i) => i.alt).length / signals.images.length >= 0.5;
  if (hasGoodHeadings && altOk) { score += 1; rawSignals.basics = true; }

  score = Math.min(10, score);
  return { category: 'ai_accessibility', score, maxScore: 10, rawSignals, issues };
};

export const ANALYZERS = [
  analyzeSchema,
  analyzeEeat,
  analyzeFaq,
  analyzeContent,
  analyzeTechnical,
  analyzeAuthority,
  analyzeAiAccessibility,
] as const;

export function runAllAnalyzers(signals: ExtractedSignals, crawl: CrawlResult): CategoryResult[] {
  return ANALYZERS.map((fn) => fn(signals, crawl));
}
