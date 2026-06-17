import * as cheerio from 'cheerio';
import type { CrawlResult } from './types.js';
import { stripHtmlToText, countWords } from './utils.js';

export interface ExtractedSignals {
  title: string;
  metaDescription: string;
  h1s: string[];
  headings: { level: number; text: string }[];
  jsonLdBlocks: unknown[];
  jsonLdTypes: string[];
  links: { href: string; text: string; rel?: string }[];
  images: { src: string; alt: string }[];
  semanticTags: string[];
  mainContentText: string;
  wordCount: number;
  hasViewport: boolean;
  hasCanonical: boolean;
  canonicalUrl: string;
  authorSignals: string[];
  contactSignals: string[];
  socialLinks: string[];
  reviewLinks: string[];
  trustPhrases: string[];
  questionHeadings: string[];
  staticBodyText: string;
  contentToCodeRatio: number;
  usedPlaywright: boolean;
  allPagesHtml: string[];
}

function extractJsonLd($: cheerio.CheerioAPI): { blocks: unknown[]; types: string[] } {
  const blocks: unknown[] = [];
  const types: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()?.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      blocks.push(parsed);
      collectTypes(parsed, types);
    } catch {
      blocks.push({ _parseError: true, raw: raw.slice(0, 200) });
    }
  });

  return { blocks, types };
}

function collectTypes(node: unknown, types: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectTypes(item, types));
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj['@graph']) collectTypes(obj['@graph'], types);
  if (typeof obj['@type'] === 'string') types.push(obj['@type']);
  else if (Array.isArray(obj['@type'])) {
    obj['@type'].forEach((t) => typeof t === 'string' && types.push(t));
  }
}

function extractMainContent($: cheerio.CheerioAPI): string {
  const clone = cheerio.load($.html());
  clone('nav, header, footer, script, style, noscript, aside').remove();
  const main = clone('main, article, [role="main"]').first();
  const text = main.length ? main.text() : clone('body').text();
  return text.replace(/\s+/g, ' ').trim();
}

export function extractSignals(crawl: CrawlResult): ExtractedSignals {
  const $ = cheerio.load(crawl.mainPage.html);
  const { blocks, types } = extractJsonLd($);

  const h1s: string[] = [];
  $('h1').each((_, el) => { h1s.push($(el).text().trim()); });

  const headings: { level: number; text: string }[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName?.toLowerCase() ?? 'h1';
    const level = parseInt(tag.replace('h', ''), 10);
    headings.push({ level, text: $(el).text().trim() });
  });

  const links: ExtractedSignals['links'] = [];
  $('a[href]').each((_, el) => {
    links.push({
      href: $(el).attr('href') ?? '',
      text: $(el).text().trim().toLowerCase(),
      rel: $(el).attr('rel'),
    });
  });

  const images: ExtractedSignals['images'] = [];
  $('img').each((_, el) => {
    images.push({ src: $(el).attr('src') ?? '', alt: $(el).attr('alt') ?? '' });
  });

  const semanticTags = ['main', 'article', 'section', 'nav', 'header', 'footer'].filter(
    (tag) => $(tag).length > 0,
  );

  const mainContentText = extractMainContent($);
  const staticClone = cheerio.load(crawl.mainPage.html);
  staticClone('script').remove();
  const staticBodyText = staticClone('body').text().replace(/\s+/g, ' ').trim();

  const htmlLength = crawl.mainPage.html.length;
  const textLength = staticBodyText.length;
  const contentToCodeRatio = htmlLength > 0 ? textLength / htmlLength : 0;

  const allText = (crawl.mainPage.html + crawl.internalPages.map((p) => p.html).join(' ')).toLowerCase();

  const socialPatterns = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'instagram.com'];
  const reviewPatterns = ['trustpilot.com', 'g2.com', 'google.com/maps', 'yelp.com'];
  const trustPatterns = ['certified', 'award', 'as seen in', 'featured in', 'press'];

  const socialLinks = links
    .filter((l) => socialPatterns.some((p) => l.href.includes(p)))
    .map((l) => l.href);
  const reviewLinks = links
    .filter((l) => reviewPatterns.some((p) => l.href.includes(p)))
    .map((l) => l.href);

  const questionHeadings = headings
    .filter((h) => h.text.includes('?') || /^(what|how|why|when|where|who|can|do|does|is|are)\b/i.test(h.text))
    .map((h) => h.text);

  const authorSignals: string[] = [];
  if ($('[rel="author"]').length) authorSignals.push('rel=author');
  if ($('.author, .byline, [class*="author"]').length) authorSignals.push('author-class');
  if (types.some((t) => t === 'Person')) authorSignals.push('Person schema');

  const contactSignals: string[] = [];
  if (allText.match(/[\w.-]+@[\w.-]+\.\w+/)) contactSignals.push('email');
  if ($('a[href^="tel:"]').length) contactSignals.push('telephone');
  if (allText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)) contactSignals.push('phone-pattern');
  if (allText.match(/\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|blvd|drive|dr)/i)) contactSignals.push('address');

  return {
    title: $('title').first().text().trim(),
    metaDescription: $('meta[name="description"]').attr('content')?.trim() ?? '',
    h1s,
    headings,
    jsonLdBlocks: blocks,
    jsonLdTypes: types,
    links,
    images,
    semanticTags,
    mainContentText,
    wordCount: countWords(mainContentText),
    hasViewport: $('meta[name="viewport"]').length > 0,
    hasCanonical: $('link[rel="canonical"]').length > 0,
    canonicalUrl: $('link[rel="canonical"]').attr('href') ?? '',
    authorSignals,
    contactSignals,
    socialLinks,
    reviewLinks,
    trustPhrases: trustPatterns.filter((p) => allText.includes(p)),
    questionHeadings,
    staticBodyText,
    contentToCodeRatio,
    usedPlaywright: crawl.mainPage.usedPlaywright,
    allPagesHtml: [crawl.mainPage.html, ...crawl.internalPages.map((p) => p.html)],
  };
}

export function getCombinedText(crawl: CrawlResult): string {
  return stripHtmlToText(crawl.mainPage.html);
}
