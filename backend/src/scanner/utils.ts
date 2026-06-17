import { createHash } from 'crypto';

export function normalizeUrl(input: string): { normalized: string; valid: boolean; error?: string } {
  let url = input.trim();
  if (!url) return { normalized: '', valid: false, error: 'URL is required' };

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { normalized: '', valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }
    parsed.hash = '';
    const normalized = parsed.toString().replace(/\/$/, '') || parsed.origin;
    return { normalized, valid: true };
  } catch {
    return { normalized: '', valid: false, error: 'Invalid URL format' };
  }
}

export function getOrigin(url: string): string {
  const parsed = new URL(url);
  return parsed.origin;
}

export function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function isSameOrigin(base: string, target: string): boolean {
  try {
    return new URL(base).origin === new URL(target).origin;
  } catch {
    return false;
  }
}

export function hashContent(...parts: string[]): string {
  return createHash('sha256').update(parts.join('::')).digest('hex');
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}
