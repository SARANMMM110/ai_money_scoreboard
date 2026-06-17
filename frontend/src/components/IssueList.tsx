import type { Issue } from '../types';

const priorityStyles = {
  high: 'text-sig-critical bg-sig-critical/10 border-sig-critical/20',
  medium: 'text-sig-caution bg-sig-caution/10 border-sig-caution/20',
  low: 'text-text-dim bg-surface-2 border-line',
};

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return <p className="text-text-dim text-sm">No issues detected — excellent work.</p>;
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <div key={issue.id} className="bg-surface border border-line rounded-xl p-5">
          <div className="flex items-start gap-3 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded border capitalize ${priorityStyles[issue.priority]}`}>
              {issue.priority}
            </span>
            <h4 className="text-sm font-medium text-text flex-1">{issue.name}</h4>
            {issue.isQuickWin && (
              <span className="text-xs text-brand bg-brand/10 px-2 py-0.5 rounded">Quick win</span>
            )}
          </div>
          <p className="text-sm text-text-dim mb-3">{issue.problem ?? issue.description}</p>
          {issue.solution && (
            <div className="border-t border-line pt-3 mt-3">
              <p className="text-xs text-text-faint uppercase tracking-wide mb-1">Solution</p>
              <p className="text-sm text-text">{issue.solution}</p>
              {issue.expectedImpact && (
                <p className="text-xs text-text-dim mt-2">
                  Expected impact: {issue.expectedImpact}
                  {issue.effort && ` · Effort: ${issue.effort}`}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function QuickWinsStrip({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;

  return (
    <div className="bg-brand/5 border border-brand/20 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-brand mb-4">Quick Wins</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {issues.map((issue) => (
          <div key={issue.id} className="bg-surface/50 rounded-lg p-4 border border-line/50">
            <p className="text-sm font-medium text-text mb-1">{issue.name}</p>
            <p className="text-xs text-text-dim">{issue.solution ?? issue.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
