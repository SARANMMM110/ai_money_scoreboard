import * as cheerio from 'cheerio';
import type { CrawlResult, CrawlPage } from './types.js';
import { resolveUrl, isSameOrigin } from './utils.js';
import { DEEP_INTERNAL_PAGES } from './crawler.js';

export interface DeepPageAudit {
  url: string;
  path: string;
  schemaScore: number;
  maxSchemaScore: number;
  wordCount: number;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  internalLinksOut: number;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  robotsMeta: string | null;
  blockedByRobots: boolean;
  issues: string[];
}

export interface DeepLinkEdge {
  from: string;
  to: string;
  anchor: string;
}

export interface DeepBotAudit {
  path: string;
  blockedByRobotsTxt: boolean;
  robotsMeta: string | null;
  aiBotMentioned: boolean;
}

export interface DeepAuditData {
  extendedCrawl: true;
  pagesCrawled: number;
  maxPages: number;
  llmsTxt: {
    present: boolean;
    lineCount: number;
    preview: string | null;
  };
  botCrawlability: DeepBotAudit[];
  pageAudits: DeepPageAudit[];
  internalLinkMap: DeepLinkEdge[];
  orphanPages: string[];
  hubPages: { url: string; path: string; inboundCount: number }[];
  summary: {
    pagesWithSchema: number;
    pagesMissingSchema: number;
    avgWordCount: number;
    blockedPaths: number;
    totalInternalLinks: number;
    thinPages: number;
  };
  auditedAt: string;
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

function parseRobotsDisallow(robotsTxt: string | null, path: string): boolean {
  if (!robotsTxt) return false;
  const lines = robotsTxt.split('\n');
  let active = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^user-agent:\s*\*/i.test(trimmed)) active = true;
    else if (/^user-agent:/i.test(trimmed)) active = false;
    else if (active && /^disallow:\s*(.+)/i.test(trimmed)) {
      const rule = trimmed.match(/^disallow:\s*(.+)/i)?.[1]?.trim();
      if (rule && rule !== '' && path.startsWith(rule)) return true;
    }
  }
  return false;
}

function extractJsonLdTypes(html: string): string[] {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() ?? '';
      const data = JSON.parse(raw) as { '@type'?: string | string[]; '@graph'?: { '@type'?: string }[] };
      const add = (t: string | string[] | undefined) => {
        if (!t) return;
        if (Array.isArray(t)) t.forEach((x) => types.add(x));
        else types.add(t);
      };
      add(data['@type']);
      data['@graph']?.forEach((n) => add(n['@type']));
    } catch {
      /* invalid json-ld */
    }
  });
  return Array.from(types);
}

function scoreSchema(types: string[]): number {
  let score = 0;
  const awarded = new Set<string>();
  for (const type of types) {
    const pts = SCHEMA_TYPES[type];
    if (pts && !awarded.has(type)) {
      score += pts;
      awarded.add(type);
    }
  }
  return Math.min(15, score);
}

function auditPage(page: CrawlPage, crawl: CrawlResult): DeepPageAudit {
  const $ = cheerio.load(page.html);
  const path = (() => {
    try {
      return new URL(page.url).pathname || '/';
    } catch {
      return page.url;
    }
  })();

  $('script, style, noscript').remove();
  const wordCount = $.root().text().replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const jsonLdTypes = extractJsonLdTypes(page.html);
  const schemaScore = scoreSchema(jsonLdTypes);
  const robotsMeta = $('meta[name="robots"]').attr('content') ?? null;
  const hasTitle = ($('title').text().trim().length > 0);
  const hasMetaDescription = ($('meta[name="description"]').attr('content')?.trim().length ?? 0) > 0;

  const internalLinksOut = $('a[href]').filter((_, el) => {
    const href = $(el).attr('href');
    if (!href) return false;
    const resolved = resolveUrl(page.url, href);
    return !!(resolved && isSameOrigin(page.url, resolved));
  }).length;

  const issues: string[] = [];
  if (schemaScore < 3) issues.push('Missing or weak structured data');
  if (wordCount < 300) issues.push(`Thin content (${wordCount} words)`);
  if (!hasTitle) issues.push('Missing title tag');
  if (!hasMetaDescription) issues.push('Missing meta description');
  if (robotsMeta?.toLowerCase().includes('noindex')) issues.push('Page marked noindex');
  if (parseRobotsDisallow(crawl.robotsTxt, path)) issues.push('Blocked in robots.txt');

  return {
    url: page.url,
    path,
    schemaScore,
    maxSchemaScore: 15,
    wordCount,
    hasJsonLd: jsonLdTypes.length > 0,
    jsonLdTypes,
    internalLinksOut,
    hasTitle,
    hasMetaDescription,
    robotsMeta,
    blockedByRobots: parseRobotsDisallow(crawl.robotsTxt, path),
    issues,
  };
}

function buildLinkMap(pages: CrawlPage[]): DeepLinkEdge[] {
  const edges: DeepLinkEdge[] = [];
  for (const page of pages) {
    const $ = cheerio.load(page.html);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const resolved = resolveUrl(page.url, href);
      if (!resolved || !isSameOrigin(page.url, resolved)) return;
      const anchor = $(el).text().trim().slice(0, 80) || href;
      edges.push({ from: page.url, to: resolved.replace(/\/$/, '') || resolved, anchor });
    });
  }
  return edges.slice(0, 200);
}

function buildBotAudit(crawl: CrawlResult, pages: CrawlPage[]): DeepBotAudit[] {
  const aiBotPatterns = ['gptbot', 'chatgpt-user', 'anthropic-ai', 'claudebot', 'google-extended', 'perplexitybot'];
  const robotsLower = (crawl.robotsTxt ?? '').toLowerCase();
  const aiBotMentioned = aiBotPatterns.some((b) => robotsLower.includes(b));

  return pages.map((page) => {
    const $ = cheerio.load(page.html);
    const path = (() => {
      try {
        return new URL(page.url).pathname || '/';
      } catch {
        return '/';
      }
    })();
    return {
      path,
      blockedByRobotsTxt: parseRobotsDisallow(crawl.robotsTxt, path),
      robotsMeta: $('meta[name="robots"]').attr('content') ?? null,
      aiBotMentioned,
    };
  });
}

export function buildDeepAudit(crawl: CrawlResult): DeepAuditData {
  const allPages = [crawl.mainPage, ...crawl.internalPages];
  const pageAudits = allPages.map((p) => auditPage(p, crawl));
  const internalLinkMap = buildLinkMap(allPages);

  const inbound = new Map<string, number>();
  for (const edge of internalLinkMap) {
    inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }

  const normalizedMain = crawl.normalizedUrl.replace(/\/$/, '');
  const orphanPages = allPages
    .map((p) => p.url.replace(/\/$/, '') || p.url)
    .filter((url) => url !== normalizedMain && (inbound.get(url) ?? 0) === 0);

  const hubPages = allPages
    .map((p) => ({
      url: p.url,
      path: (() => {
        try {
          return new URL(p.url).pathname;
        } catch {
          return p.url;
        }
      })(),
      inboundCount: inbound.get(p.url.replace(/\/$/, '') || p.url) ?? 0,
    }))
    .sort((a, b) => b.inboundCount - a.inboundCount)
    .slice(0, 8);

  const llmsLines = crawl.llmsTxt?.split('\n').filter((l) => l.trim()) ?? [];

  return {
    extendedCrawl: true,
    pagesCrawled: allPages.length,
    maxPages: DEEP_INTERNAL_PAGES + 1,
    llmsTxt: {
      present: !!crawl.llmsTxt,
      lineCount: llmsLines.length,
      preview: crawl.llmsTxt ? crawl.llmsTxt.slice(0, 400) : null,
    },
    botCrawlability: buildBotAudit(crawl, allPages),
    pageAudits,
    internalLinkMap,
    orphanPages,
    hubPages,
    summary: {
      pagesWithSchema: pageAudits.filter((p) => p.hasJsonLd).length,
      pagesMissingSchema: pageAudits.filter((p) => !p.hasJsonLd).length,
      avgWordCount: Math.round(pageAudits.reduce((s, p) => s + p.wordCount, 0) / Math.max(1, pageAudits.length)),
      blockedPaths: pageAudits.filter((p) => p.blockedByRobots).length,
      totalInternalLinks: internalLinkMap.length,
      thinPages: pageAudits.filter((p) => p.wordCount < 300).length,
    },
    auditedAt: new Date().toISOString(),
  };
}
