export const CATEGORIES = [
  { key: 'schema', name: 'Schema Markup', maxScore: 15, weight: 15 },
  { key: 'eeat', name: 'E-E-A-T', maxScore: 15, weight: 15 },
  { key: 'faq', name: 'FAQ Coverage', maxScore: 15, weight: 15 },
  { key: 'content', name: 'Content Depth', maxScore: 15, weight: 15 },
  { key: 'technical', name: 'Technical SEO', maxScore: 15, weight: 15 },
  { key: 'authority', name: 'Authority Signals', maxScore: 15, weight: 15 },
  { key: 'ai_accessibility', name: 'AI Accessibility', maxScore: 10, weight: 10 },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

export interface CrawlPage {
  url: string;
  html: string;
  statusCode: number;
  contentType: string;
  usedPlaywright: boolean;
}

export interface CrawlResult {
  mainPage: CrawlPage;
  robotsTxt: string | null;
  sitemapXml: string | null;
  llmsTxt: string | null;
  internalPages: CrawlPage[];
  baseUrl: string;
  normalizedUrl: string;
  contentHash: string;
  errors: string[];
}

export interface DetectedIssue {
  category: CategoryKey;
  name: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  isQuickWin: boolean;
  problem?: string;
  reason?: string;
  solution?: string;
  expectedImpact?: string;
  effort?: string;
}

export interface CategoryResult {
  category: CategoryKey;
  score: number;
  maxScore: number;
  rawSignals: Record<string, unknown>;
  issues: DetectedIssue[];
}

export interface ScanResult {
  overallScore: number;
  band: string;
  categories: CategoryResult[];
  issues: DetectedIssue[];
  contentHash: string;
}

export function getScoreBand(score: number): string {
  if (score >= 80) return 'AI-Ready';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Critical';
}

export function getBandColor(score: number): string {
  if (score >= 80) return '#3DD4C0';
  if (score >= 60) return '#8FE36B';
  if (score >= 40) return '#FFB454';
  return '#FF6B5B';
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  schema: 'Schema Markup',
  eeat: 'E-E-A-T',
  faq: 'FAQ Coverage',
  content: 'Content Depth',
  technical: 'Technical SEO',
  authority: 'Authority Signals',
  ai_accessibility: 'AI Accessibility',
};

export const SCAN_STATUS_MESSAGES: Record<CategoryKey, string> = {
  schema: 'Reading structured data…',
  eeat: 'Checking E-E-A-T…',
  faq: 'Analyzing FAQ coverage…',
  content: 'Measuring content depth…',
  technical: 'Auditing technical SEO…',
  authority: 'Scanning authority signals…',
  ai_accessibility: 'Testing AI accessibility…',
};
