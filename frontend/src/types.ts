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
}

export interface CategoryScore {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  rawSignals: Record<string, unknown>;
}

export interface Issue {
  id: string;
  category: string;
  name: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  isQuickWin: boolean;
  problem: string | null;
  reason: string | null;
  solution: string | null;
  expectedImpact: string | null;
  effort: string | null;
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
  report: { id: string; pdfUrl: string | null; shareToken: string } | null;
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
  if (score >= 80) return 'var(--sig-ready)';
  if (score >= 60) return 'var(--sig-good)';
  if (score >= 40) return 'var(--sig-caution)';
  return 'var(--sig-critical)';
}

export function getCategoryColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  return getScoreColor(pct);
}
