import type { CategoryResult, DetectedIssue } from './types.js';
import type { ExtractedSignals } from './extractor.js';
import type { CrawlResult } from './types.js';

type AnalyzerFn = (signals: ExtractedSignals, crawl: CrawlResult) => CategoryResult;

function issue(
  category: CategoryResult['category'],
  name: string,
  description: string,
  impact: string,
  priority: DetectedIssue['priority'],
  isQuickWin = false,
): DetectedIssue {
  return { category, name, description, impact, priority, isQuickWin };
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
  const issues: DetectedIssue[] = [];
  const rawSignals: Record<string, unknown> = { typesFound: [], pointsAwarded: {}, parseErrors: 0 };
  let score = 0;

  const hasParseError = signals.jsonLdBlocks.some(
    (b) => b && typeof b === 'object' && '_parseError' in (b as object),
  );
  if (hasParseError) {
    issues.push(
      issue('schema', 'Invalid structured data', 'One or more JSON-LD blocks failed to parse.', 'AI engines cannot read broken schema markup.', 'high'),
    );
    rawSignals.parseErrors = signals.jsonLdBlocks.filter(
      (b) => b && typeof b === 'object' && '_parseError' in (b as object),
    ).length;
  }

  const awarded = new Set<string>();
  for (const type of signals.jsonLdTypes) {
    const pts = SCHEMA_TYPES[type];
    if (pts && !awarded.has(type)) {
      score += pts;
      awarded.add(type);
      (rawSignals.pointsAwarded as Record<string, number>)[type] = pts;
    }
  }
  rawSignals.typesFound = signals.jsonLdTypes;

  score = Math.min(15, score);

  if (score < 3) {
    issues.push(
      issue('schema', 'Missing schema markup', 'No structured data detected on this page.', 'AI search engines rely on schema to understand your content.', 'high', true),
    );
  }
  if (!signals.jsonLdTypes.includes('FAQPage') && score < 15) {
    issues.push(
      issue('schema', 'No FAQ schema', 'FAQPage structured data not found.', 'FAQ schema helps AI cite your answers directly.', 'medium', true),
    );
  }

  return { category: 'schema', score, maxScore: 15, rawSignals, issues };
};

export const analyzeEeat: AnalyzerFn = (signals, crawl) => {
  const issues: DetectedIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  const allLinks = signals.links;
  const allHtml = crawl.mainPage.html.toLowerCase() + crawl.internalPages.map((p) => p.html).join(' ').toLowerCase();

  const hasAbout = allLinks.some(
    (l) => l.href.includes('/about') || l.text.includes('about us') || l.text === 'about',
  ) || allHtml.includes('/about');
  if (hasAbout) { score += 3; rawSignals.aboutPage = true; }
  else issues.push(issue('eeat', 'No about page', 'No link to an about page detected.', 'AI engines assess trust through transparency about who you are.', 'medium'));

  if (signals.contactSignals.length > 0) { score += 3; rawSignals.contact = signals.contactSignals; }
  else issues.push(issue('eeat', 'Missing contact info', 'No email, phone, or address found.', 'Contact information builds trust with AI and users.', 'high', true));

  if (signals.authorSignals.length > 0) { score += 3; rawSignals.author = signals.authorSignals; }
  else issues.push(issue('eeat', 'No author attribution', 'No author byline or Person schema detected.', 'Author signals help AI assess expertise.', 'medium', true));

  const hasTrustPages = allLinks.some(
    (l) => l.href.includes('privacy') || l.href.includes('terms'),
  );
  const hasTrustPhrases = signals.trustPhrases.length > 0;
  if (hasTrustPages || hasTrustPhrases) {
    score += 2;
    rawSignals.trust = { pages: hasTrustPages, phrases: signals.trustPhrases };
  }

  const hasTestimonials = allHtml.includes('testimonial') || allHtml.includes('review') || signals.reviewLinks.length > 0;
  if (hasTestimonials) { score += 2; rawSignals.testimonials = true; }

  const authDomains = ['.gov', '.edu', 'wikipedia.org', 'scholar.google'];
  const hasOutboundAuth = signals.links.some((l) => authDomains.some((d) => l.href.includes(d)));
  if (hasOutboundAuth) { score += 2; rawSignals.authoritativeLinks = true; }

  score = Math.min(15, score);
  return { category: 'eeat', score, maxScore: 15, rawSignals, issues };
};

export const analyzeFaq: AnalyzerFn = (signals, crawl) => {
  const issues: DetectedIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  if (signals.jsonLdTypes.includes('FAQPage')) {
    score += 6;
    rawSignals.faqSchema = true;
  } else {
    issues.push(issue('faq', 'No FAQ schema', 'FAQPage structured data not present.', 'FAQ schema is the strongest signal for AI Q&A citation.', 'high', true));
  }

  const questionCount = signals.questionHeadings.length;
  rawSignals.questionHeadings = questionCount;
  if (questionCount >= 3) score += 5;
  else if (questionCount > 0) {
    score += 2;
    issues.push(issue('faq', 'Few question headings', `Only ${questionCount} question-style heading(s) found.`, 'More question-formatted headings improve AI discoverability.', 'medium'));
  } else {
    issues.push(issue('faq', 'No question headings', 'Headings are not phrased as questions.', 'Question headings help AI match user queries to your content.', 'medium'));
  }

  const allLinks = signals.links;
  const allHtml = crawl.mainPage.html.toLowerCase();
  const hasFaqPage = allLinks.some((l) => l.href.includes('/faq')) || allHtml.includes('accordion') || allHtml.includes('faq-item');
  if (hasFaqPage) { score += 4; rawSignals.faqPage = true; }
  else issues.push(issue('faq', 'No dedicated FAQ section', 'No /faq page or accordion Q&A pattern found.', 'A dedicated FAQ section increases citation chances.', 'medium'));

  score = Math.min(15, score);
  return { category: 'faq', score, maxScore: 15, rawSignals, issues };
};

export const analyzeContent: AnalyzerFn = (signals) => {
  const issues: DetectedIssue[] = [];
  const rawSignals: Record<string, unknown> = { wordCount: signals.wordCount };
  let score = 0;

  const wc = signals.wordCount;
  if (wc >= 2000) score += 9;
  else if (wc >= 1200) score += 9;
  else if (wc >= 600) score += 6;
  else if (wc >= 300) score += 3;
  else {
    issues.push(issue('content', 'Thin content', `Main content has only ${wc} words.`, 'AI engines prefer substantive content they can cite.', 'high'));
  }

  const levels = signals.headings.map((h) => h.level);
  const hasH1 = levels.includes(1);
  const ordered = hasH1 && levels.every((l, i) => i === 0 || l <= levels[i - 1]! + 1);
  if (ordered && signals.headings.length >= 2) { score += 3; rawSignals.headingHierarchy = true; }
  else issues.push(issue('content', 'Weak heading hierarchy', 'Heading structure is missing or out of order.', 'Clear hierarchy helps AI parse content structure.', 'medium'));

  const internalLinks = signals.links.filter((l) => !l.href.startsWith('http') || l.href.includes(new URL(signals.canonicalUrl || 'https://x.com').hostname)).length;
  rawSignals.internalLinks = internalLinks;
  if (internalLinks >= 5) score += 3;
  else if (internalLinks >= 2) score += 1;
  else issues.push(issue('content', 'Few internal links', 'Limited internal linking detected.', 'Internal links help AI discover related content.', 'low'));

  score = Math.min(15, score);
  return { category: 'content', score, maxScore: 15, rawSignals, issues };
};

export const analyzeTechnical: AnalyzerFn = (signals, crawl) => {
  const issues: DetectedIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  const titleLen = signals.title.length;
  if (signals.title && titleLen >= 30 && titleLen <= 60) { score += 2; rawSignals.title = { length: titleLen, ok: true }; }
  else {
    issues.push(issue('technical', 'Title tag issue', signals.title ? `Title is ${titleLen} characters (ideal: 30–60).` : 'No title tag found.', 'Title tags are primary signals for AI and search.', signals.title ? 'medium' : 'high', !signals.title));
    if (signals.title) rawSignals.title = { length: titleLen, ok: false };
  }

  const descLen = signals.metaDescription.length;
  if (signals.metaDescription && descLen >= 120 && descLen <= 160) { score += 2; rawSignals.metaDescription = { length: descLen, ok: true }; }
  else {
    issues.push(issue('technical', 'Meta description issue', signals.metaDescription ? `Description is ${descLen} chars (ideal: 120–160).` : 'Missing meta description.', 'Meta descriptions help AI summarize your page.', 'medium', !signals.metaDescription));
  }

  if (signals.h1s.length === 1) { score += 2; rawSignals.h1Count = 1; }
  else {
    issues.push(issue('technical', 'H1 tag issue', signals.h1s.length === 0 ? 'No H1 tag found.' : `${signals.h1s.length} H1 tags found (should be exactly 1).`, 'A single H1 clarifies page topic for AI.', 'medium'));
    rawSignals.h1Count = signals.h1s.length;
  }

  if (crawl.sitemapXml) { score += 2; rawSignals.sitemap = true; }
  else issues.push(issue('technical', 'No sitemap', '/sitemap.xml not reachable.', 'Sitemaps help AI crawlers discover all pages.', 'medium'));

  if (crawl.robotsTxt) {
    const blocks = crawl.robotsTxt.toLowerCase().includes('disallow: /');
    if (!blocks) { score += 1; rawSignals.robotsTxt = true; }
    else issues.push(issue('technical', 'Robots.txt blocking', 'robots.txt may block crawlers.', 'Blocked crawlers cannot index your content.', 'high'));
  } else issues.push(issue('technical', 'No robots.txt', 'robots.txt not found.', 'A robots.txt file guides crawler behavior.', 'low'));

  const withAlt = signals.images.filter((i) => i.alt.trim().length > 0).length;
  const altPct = signals.images.length > 0 ? (withAlt / signals.images.length) * 100 : 100;
  rawSignals.altCoverage = altPct;
  if (altPct >= 80) score += 2;
  else {
    issues.push(issue('technical', 'Missing alt text', `${Math.round(altPct)}% of images have alt text.`, 'Alt text helps AI understand visual content.', 'medium', true));
    if (altPct >= 50) score += 1;
  }

  if (signals.hasViewport) { score += 2; rawSignals.viewport = true; }
  else issues.push(issue('technical', 'No viewport meta', 'Mobile viewport meta tag missing.', 'Mobile-friendly pages rank better in AI results.', 'low', true));

  if (signals.hasCanonical) { score += 2; rawSignals.canonical = signals.canonicalUrl; }
  else issues.push(issue('technical', 'No canonical tag', 'Canonical URL not specified.', 'Canonical tags prevent duplicate content confusion.', 'medium', true));

  score = Math.min(15, score);
  return { category: 'technical', score, maxScore: 15, rawSignals, issues };
};

export const analyzeAuthority: AnalyzerFn = (signals, crawl) => {
  const issues: DetectedIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  const socialCount = Math.min(signals.socialLinks.length, 5);
  score += Math.min(5, socialCount);
  rawSignals.socialLinks = signals.socialLinks;
  if (socialCount === 0) issues.push(issue('authority', 'No social profiles', 'No social media links detected.', 'Social profiles validate brand identity for AI.', 'medium', true));

  if (signals.reviewLinks.length > 0) { score += 3; rawSignals.reviewLinks = signals.reviewLinks; }
  else issues.push(issue('authority', 'No review platform links', 'No Trustpilot, G2, or similar links found.', 'Third-party reviews build authority signals.', 'low'));

  const allText = crawl.mainPage.html.toLowerCase();
  const hasNAP = signals.contactSignals.includes('phone-pattern') || signals.contactSignals.includes('telephone');
  const hasAddress = signals.contactSignals.includes('address');
  if (hasNAP && hasAddress) { score += 3; rawSignals.nap = true; }
  else if (hasNAP || hasAddress) { score += 1; rawSignals.nap = 'partial'; }

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
  const issues: DetectedIssue[] = [];
  const rawSignals: Record<string, unknown> = {};
  let score = 0;

  const semanticCount = signals.semanticTags.length;
  if (semanticCount >= 4) { score += 3; rawSignals.semanticTags = signals.semanticTags; }
  else if (semanticCount >= 2) { score += 2; rawSignals.semanticTags = signals.semanticTags; }
  else issues.push(issue('ai_accessibility', 'Missing semantic HTML', 'Few HTML5 semantic elements detected.', 'Semantic tags help AI parsers identify content regions.', 'medium'));

  if (signals.contentToCodeRatio >= 0.05) { score += 2; rawSignals.contentToCodeRatio = signals.contentToCodeRatio; }
  else issues.push(issue('ai_accessibility', 'Low content-to-code ratio', 'Page has excessive markup relative to content.', 'AI parsers struggle with code-heavy pages.', 'medium'));

  const staticWords = signals.staticBodyText.split(/\s+/).filter(Boolean).length;
  rawSignals.staticWordCount = staticWords;
  if (staticWords >= 200 && !signals.usedPlaywright) { score += 3; rawSignals.staticContent = true; }
  else if (signals.usedPlaywright) {
    issues.push(issue('ai_accessibility', 'JS-gated content', 'Primary content requires JavaScript to render.', 'AI crawlers often cannot execute JavaScript.', 'high'));
    if (staticWords >= 50) score += 1;
  } else {
    issues.push(issue('ai_accessibility', 'Empty static HTML', 'Little content available without JavaScript.', 'Static HTML content is essential for AI crawlers.', 'high'));
  }

  if (crawl.llmsTxt) { score += 1; rawSignals.llmsTxt = true; }
  else issues.push(issue('ai_accessibility', 'No llms.txt', 'llms.txt file not found.', 'llms.txt helps AI systems understand your site.', 'low'));

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
