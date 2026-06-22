import { fetch as undiciFetch } from 'undici';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import type { CrawlResult, CrawlPage } from './types.js';
import { normalizeUrl, getOrigin, resolveUrl, isSameOrigin, hashContent } from './utils.js';

const FETCH_TIMEOUT = 15_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB
const SCAN_INTERNAL_PAGES = 20;
/** @deprecated use SCAN_INTERNAL_PAGES */
const FLASH_INTERNAL_PAGES = SCAN_INTERNAL_PAGES;
const DEEP_INTERNAL_PAGES = SCAN_INTERNAL_PAGES;

export interface CrawlOptions {
  maxInternalPages?: number;
}

interface FetchOptions {
  timeout?: number;
  usePlaywright?: boolean;
}

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await undiciFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AI-Money-Scorecard/1.0 (+https://aimoneyscoreboard.com/bot)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    return response as unknown as Response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url: string, options: FetchOptions = {}): Promise<CrawlPage> {
  const timeout = options.timeout ?? FETCH_TIMEOUT;

  if (options.usePlaywright) {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      const html = await page.content();
      return { url, html, statusCode: 200, contentType: 'text/html', usedPlaywright: true };
    } finally {
      await browser.close();
    }
  }

  try {
    const response = await fetchWithTimeout(url, timeout);
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_SIZE) {
      throw new Error('Response too large');
    }
    const html = new TextDecoder().decode(buffer);
    return {
      url,
      html,
      statusCode: response.status,
      contentType,
      usedPlaywright: false,
    };
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

function hasMeaningfulContent(html: string): boolean {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  const text = $.root().text().replace(/\s+/g, ' ').trim();
  return text.length > 200;
}

async function fetchTextResource(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url, 8000);
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > MAX_RESPONSE_SIZE) return null;
    return text;
  } catch {
    return null;
  }
}

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

function extractInternalLinks(html: string, baseUrl: string, limit: number): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const resolved = resolveUrl(baseUrl, href);
    if (resolved && isSameOrigin(baseUrl, resolved)) {
      links.add(resolved.replace(/\/$/, '') || resolved);
    }
  });
  return Array.from(links).slice(0, limit + 10);
}

export async function crawlWebsite(inputUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxInternal = options.maxInternalPages ?? FLASH_INTERNAL_PAGES;
  const { normalized, valid, error } = normalizeUrl(inputUrl);
  if (!valid) throw new Error(error ?? 'Invalid URL');

  const origin = getOrigin(normalized);
  const errors: string[] = [];

  let mainPage: CrawlPage;
  try {
    mainPage = await fetchHtml(normalized);
    if (!mainPage.contentType.includes('text/html') && !mainPage.html.includes('<html')) {
      throw new Error('URL does not return HTML content');
    }
    if (!hasMeaningfulContent(mainPage.html)) {
      mainPage = await fetchHtml(normalized, { usePlaywright: true });
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Could not reach website');
  }

  const robotsTxt = await fetchTextResource(`${origin}/robots.txt`);
  const mainPath = new URL(normalized).pathname;
  if (parseRobotsDisallow(robotsTxt, mainPath)) {
    throw new Error('This site blocks our scanner in robots.txt');
  }

  const [sitemapXml, llmsTxt] = await Promise.all([
    fetchTextResource(`${origin}/sitemap.xml`),
    fetchTextResource(`${origin}/llms.txt`),
  ]);

  const internalLinks = extractInternalLinks(mainPage.html, normalized, maxInternal)
    .filter((link) => link !== normalized.replace(/\/$/, ''))
    .slice(0, maxInternal);

  const internalPages: CrawlPage[] = [];
  for (const link of internalLinks) {
    if (parseRobotsDisallow(robotsTxt, new URL(link).pathname)) continue;
    try {
      const page = await fetchHtml(link);
      if (page.contentType.includes('text/html') || page.html.includes('<html')) {
        internalPages.push(page);
      }
    } catch {
      errors.push(`Could not fetch internal page: ${link}`);
    }
  }

  const contentHash = hashContent(
    mainPage.html,
    robotsTxt ?? '',
    sitemapXml ?? '',
    llmsTxt ?? '',
    ...internalPages.map((p) => p.html),
  );

  return {
    mainPage,
    robotsTxt,
    sitemapXml,
    llmsTxt,
    internalPages,
    baseUrl: origin,
    normalizedUrl: normalized,
    contentHash,
    errors,
  };
}

export { SCAN_INTERNAL_PAGES, FLASH_INTERNAL_PAGES, DEEP_INTERNAL_PAGES };

export async function checkUrlReachable(inputUrl: string): Promise<{ reachable: boolean; error?: string }> {
  const { valid, normalized, error } = normalizeUrl(inputUrl);
  if (!valid) return { reachable: false, error };
  try {
    const response = await fetchWithTimeout(normalized, 10000);
    return { reachable: response.ok || response.status < 500 };
  } catch {
    return { reachable: false, error: 'We could not reach that site — check the URL and try again.' };
  }
}
