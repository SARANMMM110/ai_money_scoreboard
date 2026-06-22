import * as cheerio from 'cheerio';
import type { ExtractedSignals } from './extractor.js';
import type { CrawlResult } from './types.js';
import type { DeepAuditData } from './deep-audit.js';

export const AI_BOT_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'PerplexityBot',
] as const;

export interface DeepEnrichment {
  aggregatedJsonLdTypes: string[];
  schemaParseErrors: number;
  schemaMissingRequired: string[];
  faqSchemaOnInnerPages: boolean;
  avgWordCountAcrossPages: number;
  totalInternalLinks: number;
  orphanPageCount: number;
  pagesMissingSchema: number;
  thinPages: number;
  pagesCrawled: number;
  blockedPaths: number;
  aiBotBlocked: Record<string, boolean>;
  anyAiBotBlocked: boolean;
  homepageBlockedByRobots: boolean;
  siteContactSignals: string[];
  siteAuthorSignals: string[];
}

const REQUIRED_SCHEMA_PROPS: Record<string, string[]> = {
  Organization: ['name'],
  WebSite: ['name'],
  FAQPage: ['mainEntity'],
  LocalBusiness: ['name'],
  Article: ['headline'],
  BlogPosting: ['headline'],
};

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

function validateSchemaBlock(node: unknown, missing: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => validateSchemaBlock(item, missing));
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj['@graph']) validateSchemaBlock(obj['@graph'], missing);
  const type = obj['@type'];
  const types = typeof type === 'string' ? [type] : Array.isArray(type) ? type.filter((t) => typeof t === 'string') : [];
  for (const t of types) {
    const required = REQUIRED_SCHEMA_PROPS[t];
    if (!required) continue;
    for (const prop of required) {
      if (obj[prop] == null || obj[prop] === '') missing.add(`${t}.${prop}`);
    }
  }
}

function extractValidatedSchema(html: string): {
  types: string[];
  parseErrors: number;
  missingRequired: string[];
} {
  const $ = cheerio.load(html);
  const types: string[] = [];
  const missing = new Set<string>();
  let parseErrors = 0;

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()?.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      collectTypes(parsed, types);
      validateSchemaBlock(parsed, missing);
    } catch {
      parseErrors++;
    }
  });

  return { types, parseErrors, missingRequired: Array.from(missing) };
}

export function isPathBlockedForBot(robotsTxt: string | null, path: string, bot: string): boolean {
  if (!robotsTxt) return false;
  const lines = robotsTxt.split('\n');
  let active = false;
  const botLower = bot.toLowerCase();

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^user-agent:/i.test(trimmed)) {
      const agent = trimmed.split(':')[1]?.trim().toLowerCase() ?? '';
      active = agent === '*' || agent.includes(botLower) || botLower.includes(agent);
    } else if (active && /^disallow:\s*(.+)/i.test(trimmed)) {
      const rule = trimmed.match(/^disallow:\s*(.+)/i)?.[1]?.trim();
      if (rule && rule !== '' && path.startsWith(rule)) return true;
    }
  }
  return false;
}

/** Deep deterministic layer — refines signals before the same 7 analyzers run. */
export function enrichSignals(
  signals: ExtractedSignals,
  crawl: CrawlResult,
  audit: DeepAuditData,
): ExtractedSignals {
  const allPages = [crawl.mainPage, ...crawl.internalPages];
  const aggregatedTypes = new Set<string>();
  let schemaParseErrors = 0;
  const missingRequired = new Set<string>();

  for (const page of allPages) {
    const result = extractValidatedSchema(page.html);
    result.types.forEach((t) => aggregatedTypes.add(t));
    schemaParseErrors += result.parseErrors;
    result.missingRequired.forEach((m) => missingRequired.add(m));
  }

  const homepagePath = (() => {
    try {
      return new URL(crawl.normalizedUrl).pathname || '/';
    } catch {
      return '/';
    }
  })();

  const aiBotBlocked: Record<string, boolean> = {};
  for (const bot of AI_BOT_AGENTS) {
    aiBotBlocked[bot] = isPathBlockedForBot(crawl.robotsTxt, homepagePath, bot);
  }

  const faqSchemaOnInnerPages = audit.pageAudits.some(
    (p) => p.path !== homepagePath && p.jsonLdTypes.includes('FAQPage'),
  );

  const siteHtml = allPages.map((p) => p.html).join(' ').toLowerCase();
  const siteContactSignals: string[] = [];
  if (siteHtml.match(/[\w.-]+@[\w.-]+\.\w+/)) siteContactSignals.push('email');
  if (siteHtml.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)) siteContactSignals.push('phone-pattern');
  if (siteHtml.match(/\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|blvd|drive|dr)/i)) siteContactSignals.push('address');

  const siteAuthorSignals = [...signals.authorSignals];
  for (const type of aggregatedTypes) {
    if (type === 'Person' && !siteAuthorSignals.includes('Person schema')) siteAuthorSignals.push('Person schema');
  }

  // Aggregate FAQ/question signals across all crawled pages (Deep only).
  const siteQuestionHeadings: string[] = [];
  for (const page of allPages) {
    const $ = cheerio.load(page.html);
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('?') || /^(what|how|why|when|where|who|can|do|does|is|are)\b/i.test(text)) {
        siteQuestionHeadings.push(text);
      }
    });
  }

  return {
    ...signals,
    scope: 'verified' as const,
    jsonLdTypes: Array.from(aggregatedTypes),
    wordCount: audit.summary.avgWordCount,
    questionHeadings:
      siteQuestionHeadings.length > signals.questionHeadings.length
        ? siteQuestionHeadings
        : signals.questionHeadings,
    contactSignals: siteContactSignals.length > 0 ? siteContactSignals : signals.contactSignals,
    authorSignals: siteAuthorSignals,
    deep: {
      aggregatedJsonLdTypes: Array.from(aggregatedTypes),
      schemaParseErrors,
      schemaMissingRequired: Array.from(missingRequired),
      faqSchemaOnInnerPages,
      avgWordCountAcrossPages: audit.summary.avgWordCount,
      totalInternalLinks: audit.summary.totalInternalLinks,
      orphanPageCount: audit.orphanPages.length,
      pagesMissingSchema: audit.summary.pagesMissingSchema,
      thinPages: audit.summary.thinPages,
      pagesCrawled: audit.pagesCrawled,
      blockedPaths: audit.summary.blockedPaths,
      aiBotBlocked,
      anyAiBotBlocked: Object.values(aiBotBlocked).some(Boolean),
      homepageBlockedByRobots: isPathBlockedForBot(crawl.robotsTxt, homepagePath, '*'),
      siteContactSignals,
      siteAuthorSignals,
    },
  };
}
