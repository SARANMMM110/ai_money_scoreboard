export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface ScanSummary {
  id: string;
  url: string;
  normalizedUrl: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  overallScore: number | null;
  band: string | null;
  scanDate: string;
  error: string | null;
  scanMode?: 'flash' | 'deep';
  readinessDepth?: 'estimate' | 'verified' | null;
  visibilityScore?: number | null;
}

export interface ModeDelta {
  flashScore: number;
  flashScanId: string;
  flashScanDate: string;
  verifiedScore: number;
  verifiedScanId?: string;
  verifiedScanDate?: string;
  visibilityScore?: number | null;
  delta: number;
  label: string;
}

export interface SkippedStage {
  stage: string;
  reason: string;
}

export interface DeepEngineProgress {
  engine: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'failed';
  completed: number;
  total: number;
  error?: string;
}

export interface CategoryScore {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  rawSignals: Record<string, unknown>;
}

export interface IssueCode {
  lang: string;
  body: string;
}

export interface Issue {
  id: string;
  issueId: string;
  category: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  isQuickWin: boolean;
  whyItMatters: string;
  steps: string[];
  code: IssueCode | null;
  expectedImpact: string;
  effort: string;
}

export interface ScanResult {
  id: string;
  url: string;
  normalizedUrl: string;
  status: string;
  error: string | null;
  overallScore: number | null;
  band: string | null;
  scanDate: string;
  contentHash: string | null;
  categories: CategoryScore[];
  issues: Issue[];
  quickWins: Issue[];
  reprocessing?: boolean;
  report: { id: string; pdfUrl: string | null; shareToken: string } | null;
  scanMode?: 'flash' | 'deep';
  readinessDepth?: 'estimate' | 'verified' | null;
  visibilityScore?: number | null;
  skippedStages?: SkippedStage[] | null;
  modeDelta?: ModeDelta | null;
  deepStatus?: string | null;
  deepVisibility?: DeepVisibilityData | null;
  deepAudit?: DeepAuditData | null;
  deepError?: string | null;
}

export interface DeepAuditData {
  extendedCrawl: true;
  pagesCrawled: number;
  maxPages: number;
  llmsTxt: { present: boolean; lineCount: number; preview: string | null };
  botCrawlability: {
    path: string;
    blockedByRobotsTxt: boolean;
    robotsMeta: string | null;
    aiBotMentioned: boolean;
  }[];
  pageAudits: {
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
  }[];
  internalLinkMap: { from: string; to: string; anchor: string }[];
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

export interface DeepVisibilityData {
  visibilityScore: number;
  citationRate: number;
  shareOfVoice: number;
  sentimentMix?: { positive: number; neutral: number; negative: number };
  engineScores: Record<string, { visibilityScore: number; citationRate: number; promptCount: number }>;
  enginesRan: string[];
  enginesSkipped: { engine: string; reason: string }[];
  providerErrors?: string[];
  citedDomains?: { domain: string; count: number }[];
  gapRecommendations?: import('./visibility-types').GapRecommendation[];
  results: {
    prompt: string;
    tag?: string;
    engine: string;
    mentioned: boolean;
    cited: boolean;
    sentiment?: string | null;
    answerText: string;
    sources: string[];
  }[];
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  measuredAt?: string;
  label?: string;
}

export interface ScanProgress {
  category: string;
  status: 'pending' | 'running' | 'done';
  score?: number;
}

export interface ScanStatus {
  status: string;
  error: string | null;
  progress: ScanProgress[];
  currentCategory: string | null;
  statusMessage: string;
  overallScore: number | null;
  band: string | null;
  scanMode?: string;
  readinessDepth?: string | null;
  deepStatus?: string | null;
  deepProgress?: DeepEngineProgress[] | null;
  currentEngine?: string | null;
  visibilityScore?: number | null;
}

export const CATEGORIES = [
  { key: 'schema', label: 'Schema Markup', max: 15 },
  { key: 'eeat', label: 'E-E-A-T', max: 15 },
  { key: 'faq', label: 'FAQ Coverage', max: 15 },
  { key: 'content', label: 'Content Depth', max: 15 },
  { key: 'technical', label: 'Technical SEO', max: 15 },
  { key: 'authority', label: 'Authority Signals', max: 15 },
  { key: 'ai_accessibility', label: 'AI Accessibility', max: 10 },
] as const;

export function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--ready)';
  if (score >= 60) return 'var(--good)';
  if (score >= 40) return 'var(--caution)';
  return 'var(--critical)';
}

export function getCategoryColor(score: number, max: number): string {
  return getScoreColor((score / max) * 100);
}

export function getVerdict(score: number): string {
  if (score >= 80) return 'Your site is well-positioned for AI search citation.';
  if (score >= 60) return 'Solid foundation — targeted fixes will improve AI visibility.';
  if (score >= 40) return 'AI engines can reach your site but struggle to trust and cite it.';
  return 'Critical gaps block AI search engines from reading and citing your content.';
}
