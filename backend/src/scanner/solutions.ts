import type { CategoryKey, DetectedIssue } from './types.js';
import type { ExtractedSignals } from './extractor.js';
import type { CrawlResult } from './types.js';

export interface SolutionTemplate {
  issueId: string;
  name: string;
  category: CategoryKey;
  whyItMatters: string;
  steps: string[];
  code?: { lang: string; body: string };
  effort: 'Low' | 'Medium' | 'High';
  isQuickWin: boolean;
  expectedImpact: string;
}

export interface ScanContext {
  siteUrl: string;
  brandName: string;
  shortDescription: string;
  social1: string;
  social2: string;
  title: string;
  metaDescription: string;
  h1: string;
  wordCount: number;
}

export const SOLUTION_LIBRARY: Record<string, SolutionTemplate> = {
  'missing-schema': {
    issueId: 'missing-schema',
    name: 'Missing schema markup',
    category: 'schema',
    whyItMatters:
      'AI engines read JSON-LD to identify the brand behind a site — its name, logo and links. With none present, the site is not a recognised entity to any AI engine.',
    steps: [
      'Add an Organization block inside <head> on every page (hook to wp_head / paste in the document head).',
      'Swap in the real logo URL and the actual social profile URLs under sameAs.',
      'Validate at validator.schema.org and Google\'s Rich Results Test.',
    ],
    code: {
      lang: 'html',
      body: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{{brandName}}",
  "url": "{{siteUrl}}",
  "logo": "{{siteUrl}}/logo.png",
  "description": "{{shortDescription}}",
  "sameAs": ["{{social1}}","{{social2}}"]
}
</script>`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Helps AI engines recognise your brand as a citable entity.',
  },
  'invalid-structured-data': {
    issueId: 'invalid-structured-data',
    name: 'Invalid structured data',
    category: 'schema',
    whyItMatters:
      'Broken JSON-LD is worse than none — parsers discard the entire block and may distrust other markup on the page.',
    steps: [
      'Open your page source and locate every <script type="application/ld+json"> block.',
      'Paste each block into jsonlint.com and fix syntax errors (trailing commas, unquoted keys).',
      'Re-test with validator.schema.org before redeploying.',
    ],
    code: {
      lang: 'html',
      body: `<!-- Ensure valid JSON — no trailing commas -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "{{brandName}}",
  "url": "{{siteUrl}}"
}
</script>`,
    },
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Restores AI-readable structured data on your pages.',
  },
  'schema-missing-required': {
    issueId: 'schema-missing-required',
    name: 'Schema missing required properties',
    category: 'schema',
    whyItMatters:
      'JSON-LD blocks that omit required fields (e.g. Organization without name, FAQPage without mainEntity) are ignored by validators and AI parsers — you get no credit for broken markup.',
    steps: [
      'Run validator.schema.org on each JSON-LD block flagged in the Deep audit.',
      'Add every required property for each @type (Organization → name; FAQPage → mainEntity with Question/Answer pairs).',
      'Deploy fixes site-wide on pages that share the same template or global head partial.',
    ],
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Makes existing schema blocks valid and citable by AI engines.',
  },
  'site-wide-schema-gaps': {
    issueId: 'site-wide-schema-gaps',
    name: 'Site-wide schema gaps',
    category: 'schema',
    whyItMatters:
      'When most crawled pages lack structured data, AI engines only see a thin entity signal from a few URLs — the rest of your site is invisible as structured knowledge.',
    steps: [
      'Identify page templates missing JSON-LD (product, blog, landing, FAQ).',
      'Add Organization + WebSite globally; add Article, FAQPage, or Product schema per template.',
      'Roll out via CMS template, theme header, or tag manager with server-rendered JSON-LD.',
    ],
    code: {
      lang: 'html',
      body: `<!-- Repeat appropriate @type on each major template -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "{{title}}",
  "url": "{{siteUrl}}",
  "description": "{{shortDescription}}",
  "isPartOf": { "@type": "WebSite", "name": "{{brandName}}", "url": "{{siteUrl}}" }
}
</script>`,
    },
    effort: 'High',
    isQuickWin: false,
    expectedImpact: 'Extends structured-data coverage across your full site crawl.',
  },
  'no-faq-schema': {
    issueId: 'no-faq-schema',
    name: 'No FAQ schema',
    category: 'faq',
    whyItMatters:
      'FAQPage schema is the strongest machine-readable signal for Q&A content. Without it, AI engines must guess which headings are questions and answers.',
    steps: [
      'Collect your top 5–10 customer questions and their answers from the page.',
      'Wrap them in FAQPage JSON-LD and place in <head> or before </body>.',
      'Ensure each Question has a matching acceptedAnswer with plain-text value.',
    ],
    code: {
      lang: 'html',
      body: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What does {{brandName}} do?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "{{shortDescription}}"
    }
  }]
}
</script>`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Increases chance of direct AI citation for common questions.',
  },
  'robots-blocking': {
    issueId: 'robots-blocking',
    name: 'Robots.txt blocking crawlers',
    category: 'technical',
    whyItMatters:
      'If GPTBot, ClaudeBot, PerplexityBot or Google-Extended are disallowed (or a blanket Disallow: / exists), those engines literally cannot read the pages. No other fix matters until this is cleared.',
    steps: [
      'Open {{siteUrl}}/robots.txt and look for Disallow: / or named bot blocks.',
      'On WordPress, confirm Settings → Reading → "Discourage search engines" is unchecked.',
      'Replace robots.txt with a version that explicitly allows AI crawlers.',
    ],
    code: {
      lang: 'txt',
      body: `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: {{siteUrl}}/sitemap.xml`,
    },
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Unblocks AI crawlers from reading your site.',
  },
  'ai-bot-blocked': {
    issueId: 'ai-bot-blocked',
    name: 'Specific AI bots blocked',
    category: 'technical',
    whyItMatters:
      'Per-bot Disallow rules in robots.txt block named AI crawlers (GPTBot, ClaudeBot, etc.) even when the rest of the site is open — those engines cannot cite you.',
    steps: [
      'Open {{siteUrl}}/robots.txt and find User-agent blocks for GPTBot, ClaudeBot, PerplexityBot, or Google-Extended.',
      'Remove Disallow lines for bots you want to allow, or add explicit Allow: / under each bot.',
      'Republish and re-run a Deep scan to confirm bot crawlability passes.',
    ],
    code: {
      lang: 'txt',
      body: `User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Restores access for the specific AI crawlers that were blocked.',
  },
  'thin-content': {
    issueId: 'thin-content',
    name: 'Thin content',
    category: 'content',
    whyItMatters:
      'AI engines need substantive, citable prose. Pages under 300 words rarely get quoted because there is nothing unique to attribute.',
    steps: [
      'Audit the main content area — strip nav, footer, and boilerplate when counting words.',
      'Expand with specific answers: who you serve, how you differ, proof points, and FAQs.',
      'Target at least 600 words on key landing pages; 1,200+ for pillar content.',
    ],
    effort: 'High',
    isQuickWin: false,
    expectedImpact: 'More quotable surface area for AI search answers.',
  },
  'title-tag-issue': {
    issueId: 'title-tag-issue',
    name: 'Title tag issue',
    category: 'technical',
    whyItMatters:
      'The title is the primary label AI and search systems use to name your page in answers and links. Missing or wrong-length titles reduce clarity.',
    steps: [
      'Set exactly one <title> in <head>, 30–60 characters.',
      'Lead with the primary topic or brand, then a differentiator.',
      'Avoid keyword stuffing — write for humans first.',
    ],
    code: {
      lang: 'html',
      body: `<title>{{brandName}} — {{shortDescription}}</title>`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Clearer page identity in AI-generated summaries.',
  },
  'missing-meta-description': {
    issueId: 'missing-meta-description',
    name: 'Missing meta description',
    category: 'technical',
    whyItMatters:
      'Meta descriptions are often pulled into AI snippets and search previews. Without one, engines invent a summary from random page text.',
    steps: [
      'Write a unique description per page, 120–160 characters.',
      'State what the page offers and who it is for.',
      'Place in <head> as <meta name="description" content="…">.',
    ],
    code: {
      lang: 'html',
      body: `<meta name="description" content="{{shortDescription}}">`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Controlled snippet text in AI and search results.',
  },
  'meta-description-length': {
    issueId: 'meta-description-length',
    name: 'Meta description length issue',
    category: 'technical',
    whyItMatters:
      'Descriptions outside 120–160 characters get truncated in snippets, losing your key message mid-sentence.',
    steps: [
      'Edit the meta description to 120–160 characters.',
      'Front-load the most important claim in the first 120 chars.',
      'Avoid duplicate descriptions across pages.',
    ],
    code: {
      lang: 'html',
      body: `<meta name="description" content="<!-- 120–160 chars --> {{shortDescription}}">`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Full message visible in AI and search snippets.',
  },
  'multiple-h1': {
    issueId: 'multiple-h1',
    name: 'Multiple H1 tags',
    category: 'technical',
    whyItMatters:
      'A single H1 tells AI parsers the one main topic of the page. Multiple H1s dilute that signal and confuse content hierarchy.',
    steps: [
      'Keep one H1 with the page\'s primary headline.',
      'Demote extra H1s to H2 or H3 based on outline level.',
      'Verify only one H1 remains in view-source.',
    ],
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Clearer topical focus for AI parsers.',
  },
  'no-h1': {
    issueId: 'no-h1',
    name: 'No H1 tag',
    category: 'technical',
    whyItMatters:
      'Without an H1, AI systems lack an explicit headline to anchor summaries and citations.',
    steps: [
      'Add one H1 at the top of the main content area.',
      'Match it closely to the title tag intent.',
      'Use a single descriptive phrase, not a list of keywords.',
    ],
    code: {
      lang: 'html',
      body: `<main>
  <h1>{{h1}}</h1>
  <!-- page content -->
</main>`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Stronger headline signal for AI extraction.',
  },
  'missing-alt-text': {
    issueId: 'missing-alt-text',
    name: 'Missing alt text',
    category: 'technical',
    whyItMatters:
      'AI crawlers cannot "see" images — alt text is the only signal for what visuals convey. Missing alt means lost context.',
    steps: [
      'Audit all <img> tags in the main content.',
      'Add descriptive alt on meaningful images; use alt="" on decorative ones.',
      'Aim for 80%+ coverage on content images.',
    ],
    code: {
      lang: 'html',
      body: `<!-- Meaningful image -->
<img src="/team.jpg" alt="{{brandName}} team at work" width="800" height="600">

<!-- Decorative image -->
<img src="/divider.svg" alt="" role="presentation">`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Images become readable context for AI parsers.',
  },
  'missing-semantic-html': {
    issueId: 'missing-semantic-html',
    name: 'Missing semantic HTML',
    category: 'ai_accessibility',
    whyItMatters:
      'Semantic landmarks (main, article, section, nav) tell AI parsers where primary content lives versus chrome and navigation.',
    steps: [
      'Wrap primary content in <main>.',
      'Use <article> for blog posts, <section> for logical blocks.',
      'Keep <nav>, <header>, <footer> for non-primary regions.',
    ],
    code: {
      lang: 'html',
      body: `<body>
  <header><!-- logo, nav --></header>
  <main>
    <article>
      <h1>{{h1}}</h1>
      <section><!-- content --></section>
    </article>
  </main>
  <footer><!-- contact, legal --></footer>
</body>`,
    },
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'AI parsers locate main content faster and more reliably.',
  },
  'no-about-page': {
    issueId: 'no-about-page',
    name: 'No about page',
    category: 'eeat',
    whyItMatters:
      'AI systems assess trust partly through transparency — who runs the site, their background, and mission. No about page is a trust gap.',
    steps: [
      'Create /about with founder/team bios, mission, and history.',
      'Link it from the main nav and footer with anchor text "About".',
      'Add Organization schema pointing to the about URL.',
    ],
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Stronger E-E-A-T signals for AI trust scoring.',
  },
  'missing-contact-info': {
    issueId: 'missing-contact-info',
    name: 'Missing contact info',
    category: 'eeat',
    whyItMatters:
      'Contact details (email, phone, address) prove the site represents a real entity AI can attribute and cite responsibly.',
    steps: [
      'Add a visible email and phone in the footer on every page.',
      'Create a /contact page with a form or mailto: link.',
      'Include tel: and mailto: links for machine parsing.',
    ],
    code: {
      lang: 'html',
      body: `<footer>
  <a href="mailto:hello@example.com">hello@example.com</a>
  <a href="tel:+10000000000">+1 (000) 000-0000</a>
</footer>`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Verifiable entity signals for AI trust.',
  },
  'no-author': {
    issueId: 'no-author',
    name: 'No author attribution',
    category: 'eeat',
    whyItMatters:
      'Author bylines and Person schema connect content to a human expert — a core E-E-A-T signal AI systems weigh when citing advice.',
    steps: [
      'Add a visible byline on articles ("By Name, Role").',
      'Link the author name with rel="author" to their bio page.',
      'Add Person JSON-LD with name, url, and jobTitle.',
    ],
    code: {
      lang: 'html',
      body: `<p>By <a rel="author" href="{{siteUrl}}/about">Author Name</a></p>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Author Name",
  "url": "{{siteUrl}}/about",
  "jobTitle": "Founder"
}
</script>`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Expertise attribution for AI citation decisions.',
  },
  'no-faq-section': {
    issueId: 'no-faq-section',
    name: 'No dedicated FAQ section',
    category: 'faq',
    whyItMatters:
      'A visible FAQ section (page or accordion) gives AI engines quotable Q&A pairs even before schema is added.',
    steps: [
      'Create /faq or add an on-page FAQ accordion.',
      'Phrase each item as a real user question with a concise answer.',
      'Link to it from the footer and main nav.',
    ],
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'More surfaces for AI to match user queries to your answers.',
  },
  'no-question-headings': {
    issueId: 'no-question-headings',
    name: 'No question headings',
    category: 'faq',
    whyItMatters:
      'Headings phrased as questions (What is…, How do I…) mirror how users ask AI — improving match quality.',
    steps: [
      'Rewrite at least 3 H2/H3 headings as natural questions.',
      'Follow each question heading with a direct answer paragraph.',
      'Align questions with real support/sales queries.',
    ],
    effort: 'Low',
    isQuickWin: false,
    expectedImpact: 'Better alignment with conversational AI queries.',
  },
  'few-question-headings': {
    issueId: 'few-question-headings',
    name: 'Few question headings',
    category: 'faq',
    whyItMatters:
      'Only a handful of question-style headings limits how many user queries can map to your content.',
    steps: [
      'Add more H2s phrased as questions — target at least 3.',
      'Cover pricing, process, and differentiation topics.',
      'Pair each with a 2–4 sentence direct answer.',
    ],
    effort: 'Low',
    isQuickWin: false,
    expectedImpact: 'Broader query coverage in AI search.',
  },
  'no-sitemap': {
    issueId: 'no-sitemap',
    name: 'No sitemap',
    category: 'technical',
    whyItMatters:
      'Sitemaps help AI and search crawlers discover all indexable URLs — especially new or deep pages.',
    steps: [
      'Generate sitemap.xml (Yoast, RankMath, or xml-sitemaps.com).',
      'Place at {{siteUrl}}/sitemap.xml.',
      'Reference it in robots.txt with Sitemap: line.',
    ],
    code: {
      lang: 'xml',
      body: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{{siteUrl}}/</loc></url>
  <url><loc>{{siteUrl}}/about</loc></url>
</urlset>`,
    },
    effort: 'Low',
    isQuickWin: false,
    expectedImpact: 'Full site discoverability for crawlers.',
  },
  'no-social-profiles': {
    issueId: 'no-social-profiles',
    name: 'No social profiles',
    category: 'authority',
    whyItMatters:
      'Links to official social profiles corroborate brand identity across the web — a signal AI uses to verify entities.',
    steps: [
      'Add footer icons linking to LinkedIn, X/Twitter, YouTube, etc.',
      'Use full URLs, not icon-only buttons without href.',
      'Mirror those URLs in Organization schema sameAs.',
    ],
    code: {
      lang: 'html',
      body: `<a href="{{social1}}" rel="me">LinkedIn</a>
<a href="{{social2}}" rel="me">X / Twitter</a>`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Cross-platform brand verification for AI.',
  },
  'no-review-links': {
    issueId: 'no-review-links',
    name: 'No review platform links',
    category: 'authority',
    whyItMatters:
      'Third-party review profiles (G2, Trustpilot, Capterra) provide independent trust signals AI can reference.',
    steps: [
      'Claim profiles on relevant review platforms for your category.',
      'Link to them from a "Reviews" or footer section.',
      'Keep ratings current — stale profiles hurt more than help.',
    ],
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Independent authority corroboration.',
  },
  'no-llms-txt': {
    issueId: 'no-llms-txt',
    name: 'No llms.txt',
    category: 'ai_accessibility',
    whyItMatters:
      'llms.txt is an emerging convention for telling AI systems what your site is about and which pages matter most.',
    steps: [
      'Create /llms.txt at your site root.',
      'Include a brief site summary and links to key pages.',
      'Follow the llms.txt spec at llmstxt.org.',
    ],
    code: {
      lang: 'txt',
      body: `# {{brandName}}

> {{shortDescription}}

## Key pages
- [Home]({{siteUrl}}/)
- [About]({{siteUrl}}/about)
- [Contact]({{siteUrl}}/contact)`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Explicit AI-oriented site guidance.',
  },
  'js-gated-content': {
    issueId: 'js-gated-content',
    name: 'JS-gated content',
    category: 'ai_accessibility',
    whyItMatters:
      'Most AI crawlers do not execute JavaScript. If primary content only appears after JS runs, crawlers see an empty shell.',
    steps: [
      'Server-render critical content or use static HTML fallbacks.',
      'Test with curl or view-source — body text should be substantial without JS.',
      'Consider SSR/SSG (Next.js, Nuxt) for content-heavy pages.',
    ],
    effort: 'High',
    isQuickWin: false,
    expectedImpact: 'Makes primary content readable to non-JS crawlers.',
  },
  'empty-static-html': {
    issueId: 'empty-static-html',
    name: 'Empty static HTML',
    category: 'ai_accessibility',
    whyItMatters:
      'Little or no text in the raw HTML means AI parsers have nothing to index — the page is effectively invisible.',
    steps: [
      'Inspect view-source and confirm main text is present.',
      'Move critical copy out of client-only JS bundles.',
      'Pre-render or hydrate with meaningful server HTML.',
    ],
    effort: 'High',
    isQuickWin: false,
    expectedImpact: 'Restores indexable text for AI crawlers.',
  },
  'no-canonical-tag': {
    issueId: 'no-canonical-tag',
    name: 'No canonical tag',
    category: 'technical',
    whyItMatters:
      'Canonical URLs tell AI and search systems which version of a page is authoritative — preventing duplicate-content confusion.',
    steps: [
      'Add <link rel="canonical"> in <head> on every indexable page.',
      'Point to the preferred HTTPS URL without tracking params.',
      'Self-canonicalize unless a clear duplicate exists.',
    ],
    code: {
      lang: 'html',
      body: `<link rel="canonical" href="{{siteUrl}}/">`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Clear authoritative URL for AI citation.',
  },
  'no-viewport-meta': {
    issueId: 'no-viewport-meta',
    name: 'No viewport meta',
    category: 'technical',
    whyItMatters:
      'Mobile-friendly rendering is a baseline quality signal. Missing viewport meta can affect how parsers classify page quality.',
    steps: [
      'Add viewport meta to <head> on all pages.',
      'Test on mobile devices and Google Mobile-Friendly Test.',
    ],
    code: {
      lang: 'html',
      body: `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    },
    effort: 'Low',
    isQuickWin: true,
    expectedImpact: 'Baseline mobile quality signal.',
  },
  'no-robots-txt': {
    issueId: 'no-robots-txt',
    name: 'No robots.txt',
    category: 'technical',
    whyItMatters:
      'robots.txt guides crawlers on what they may fetch. Its absence is not fatal but misses an opportunity to welcome AI bots explicitly.',
    steps: [
      'Create robots.txt at your domain root.',
      'Allow / for all bots and list your sitemap URL.',
      'Optionally add explicit Allow rules for GPTBot, ClaudeBot, etc.',
    ],
    code: {
      lang: 'txt',
      body: `User-agent: *
Allow: /

Sitemap: {{siteUrl}}/sitemap.xml`,
    },
    effort: 'Low',
    isQuickWin: false,
    expectedImpact: 'Clear crawler guidance and sitemap discovery.',
  },
  'weak-heading-hierarchy': {
    issueId: 'weak-heading-hierarchy',
    name: 'Weak heading hierarchy',
    category: 'content',
    whyItMatters:
      'Ordered H1→H2→H3 structure is how AI parsers build an outline of your page. Skipped levels or missing headings break that map.',
    steps: [
      'Start with one H1, then H2s for major sections, H3s for subsections.',
      'Never skip levels (e.g. H1 straight to H4).',
      'Audit with a heading outline tool or browser extension.',
    ],
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Clearer content outline for AI extraction.',
  },
  'few-internal-links': {
    issueId: 'few-internal-links',
    name: 'Few internal links',
    category: 'content',
    whyItMatters:
      'Internal links help AI crawlers discover related pages and understand topical relationships across your site.',
    steps: [
      'Add contextual links from this page to 5+ related pages.',
      'Use descriptive anchor text, not "click here".',
      'Link pillar pages to supporting articles and back.',
    ],
    effort: 'Low',
    isQuickWin: false,
    expectedImpact: 'Better crawl depth and topical clustering.',
  },
  'orphan-pages': {
    issueId: 'orphan-pages',
    name: 'Orphan pages (no inbound links)',
    category: 'content',
    whyItMatters:
      'Pages with no internal links pointing to them are rarely discovered by crawlers or AI indexers — they sit outside your site\'s topical graph.',
    steps: [
      'List orphan URLs from the Deep audit report.',
      'Add contextual internal links from related hub pages, nav, or footer.',
      'Include important orphans in your XML sitemap and link them from at least one high-traffic page.',
    ],
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Brings hidden pages into your crawlable site structure.',
  },
  'thin-pages-site-wide': {
    issueId: 'thin-pages-site-wide',
    name: 'Thin pages site-wide',
    category: 'content',
    whyItMatters:
      'Many pages under ~300 words signal low topical depth to AI systems — they are less likely to be cited as authoritative answers.',
    steps: [
      'Audit thin URLs flagged in the Deep crawl.',
      'Merge redundant thin pages into comprehensive guides or expand with unique FAQs and examples.',
      'Noindex or consolidate pages that cannot justify standalone content.',
    ],
    effort: 'High',
    isQuickWin: false,
    expectedImpact: 'Raises average content depth across the site.',
  },
  'low-content-ratio': {
    issueId: 'low-content-ratio',
    name: 'Low content-to-code ratio',
    category: 'ai_accessibility',
    whyItMatters:
      'Pages bloated with scripts and markup relative to visible text are harder for AI parsers to extract meaningful content from.',
    steps: [
      'Reduce inline scripts and unnecessary wrapper divs.',
      'Lazy-load non-critical JS; defer analytics.',
      'Ensure text content dominates the HTML payload.',
    ],
    effort: 'Medium',
    isQuickWin: false,
    expectedImpact: 'Cleaner signal-to-noise for AI parsers.',
  },
};

function fillTokens(text: string, ctx: ScanContext): string {
  return text
    .replace(/\{\{brandName\}\}/g, ctx.brandName)
    .replace(/\{\{siteUrl\}\}/g, ctx.siteUrl)
    .replace(/\{\{shortDescription\}\}/g, ctx.shortDescription)
    .replace(/\{\{social1\}\}/g, ctx.social1)
    .replace(/\{\{social2\}\}/g, ctx.social2)
    .replace(/\{\{title\}\}/g, ctx.title)
    .replace(/\{\{metaDescription\}\}/g, ctx.metaDescription)
    .replace(/\{\{h1\}\}/g, ctx.h1)
    .replace(/\{\{wordCount\}\}/g, String(ctx.wordCount));
}

export function buildScanContext(signals: ExtractedSignals, crawl: CrawlResult): ScanContext {
  const siteUrl = crawl.normalizedUrl.replace(/\/$/, '') || crawl.baseUrl;
  const brandName = signals.h1s[0]?.trim() || signals.title.split(/[|\-–—]/)[0]?.trim() || 'Your Brand';
  const shortDescription =
    signals.metaDescription ||
    signals.mainContentText.slice(0, 155).trim() ||
    `${brandName} — edit this description`;
  const socials = signals.socialLinks.length > 0 ? signals.socialLinks : ['https://linkedin.com/company/your-brand', 'https://x.com/your-brand'];

  return {
    siteUrl,
    brandName,
    shortDescription: shortDescription.slice(0, 160),
    social1: socials[0] ?? 'https://linkedin.com/company/your-brand',
    social2: socials[1] ?? 'https://x.com/your-brand',
    title: signals.title || `${brandName} — Page Title`,
    metaDescription: signals.metaDescription || shortDescription.slice(0, 160),
    h1: signals.h1s[0] || brandName,
    wordCount: signals.wordCount,
  };
}

export function resolveIssue(
  issueId: string,
  description: string,
  priority: DetectedIssue['priority'],
  category: CategoryKey,
  ctx: ScanContext,
): DetectedIssue {
  const template = SOLUTION_LIBRARY[issueId];
  if (!template) {
    throw new Error(`Missing solution library entry for issueId: ${issueId}`);
  }

  const steps = template.steps.map((s) => fillTokens(s, ctx));
  const code = template.code
    ? { lang: template.code.lang, body: fillTokens(template.code.body, ctx) }
    : undefined;

  return {
    issueId,
    category,
    name: template.name,
    description,
    priority,
    isQuickWin: template.isQuickWin,
    whyItMatters: fillTokens(template.whyItMatters, ctx),
    steps,
    code,
    expectedImpact: fillTokens(template.expectedImpact, ctx),
    effort: template.effort,
  };
}

export function resolveAllIssues(
  rawIssues: { issueId: string; description: string; priority: DetectedIssue['priority']; category: CategoryKey }[],
  ctx: ScanContext,
): DetectedIssue[] {
  return rawIssues.map((r) => resolveIssue(r.issueId, r.description, r.priority, r.category, ctx));
}
