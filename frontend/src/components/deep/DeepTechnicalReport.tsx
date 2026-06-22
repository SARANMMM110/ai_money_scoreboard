import type { DeepAuditData } from '../../types';
import { getCategoryColor } from '../../types';

export function DeepTechnicalReport({ audit }: { audit: DeepAuditData }) {
  const { summary } = audit;

  return (
    <section className="space-y-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple mb-1">Deep Scan · Part 2</p>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Extended site audit</h2>
        <p className="text-sm text-dim mt-2 max-w-2xl">
          Crawled {audit.pagesCrawled} pages (up to {audit.maxPages}) with per-page schema checks, internal linking analysis, and bot crawlability review — not included in Flash Scan.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pages crawled', value: audit.pagesCrawled },
          { label: 'With schema', value: summary.pagesWithSchema },
          { label: 'Missing schema', value: summary.pagesMissingSchema },
          { label: 'Thin pages', value: summary.thinPages },
          { label: 'Avg words/page', value: summary.avgWordCount },
          { label: 'Internal links', value: summary.totalInternalLinks },
          { label: 'Blocked paths', value: summary.blockedPaths },
          { label: 'llms.txt', value: audit.llmsTxt.present ? 'Found' : 'Missing' },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-line rounded-2xl p-4 shadow-card">
            <p className="text-[10px] text-faint uppercase tracking-wider">{s.label}</p>
            <p className="font-mono text-2xl font-bold text-ink mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="font-display font-semibold text-ink">Per-page breakdown</h3>
          <p className="text-xs text-dim mt-1">Schema score, content depth, and issues for each crawled URL</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-faint text-xs uppercase tracking-wider bg-surface-2">
                <th className="px-5 py-3 font-semibold">Page</th>
                <th className="px-5 py-3 font-semibold">Schema</th>
                <th className="px-5 py-3 font-semibold">Words</th>
                <th className="px-5 py-3 font-semibold">Links out</th>
                <th className="px-5 py-3 font-semibold">JSON-LD types</th>
                <th className="px-5 py-3 font-semibold">Issues</th>
              </tr>
            </thead>
            <tbody>
              {audit.pageAudits.map((p) => (
                <tr key={p.url} className="border-t border-line-soft hover:bg-surface-2/50">
                  <td className="px-5 py-3 font-mono text-xs text-ink max-w-[200px] truncate" title={p.url}>
                    {p.path}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="font-mono font-bold"
                      style={{ color: getCategoryColor(p.schemaScore, p.maxSchemaScore) }}
                    >
                      {p.schemaScore}/{p.maxSchemaScore}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-dim">{p.wordCount}</td>
                  <td className="px-5 py-3 font-mono text-dim">{p.internalLinksOut}</td>
                  <td className="px-5 py-3 text-xs text-dim">{p.jsonLdTypes.join(', ') || '—'}</td>
                  <td className="px-5 py-3">
                    {p.issues.length ? (
                      <ul className="text-xs text-dim space-y-0.5">
                        {p.issues.map((i) => (
                          <li key={i} className="text-caution">• {i}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-ready text-xs font-medium">Clean</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-semibold text-ink mb-3">Top hub pages</h3>
          <p className="text-xs text-dim mb-4">Pages receiving the most internal links from your crawled set</p>
          <ul className="space-y-2">
            {audit.hubPages.map((h) => (
              <li key={h.url} className="flex items-center justify-between text-sm">
                <span className="font-mono text-dim truncate pr-2">{h.path}</span>
                <span className="font-mono font-bold text-brand shrink-0">{h.inboundCount} in</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-semibold text-ink mb-3">Orphan pages</h3>
          <p className="text-xs text-dim mb-4">Crawled pages with no inbound internal links (harder for AI crawlers to discover)</p>
          {audit.orphanPages.length ? (
            <ul className="space-y-1.5 text-xs font-mono text-dim max-h-48 overflow-y-auto">
              {audit.orphanPages.map((u) => (
                <li key={u} className="truncate">{u}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ready">No orphan pages detected in crawled set.</p>
          )}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
        <h3 className="font-display font-semibold text-ink mb-3">Bot &amp; AI crawler accessibility</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-faint text-xs uppercase tracking-wider">
                <th className="pb-2 pr-4">Path</th>
                <th className="pb-2 pr-4">robots.txt</th>
                <th className="pb-2 pr-4">meta robots</th>
                <th className="pb-2">AI bots in robots.txt</th>
              </tr>
            </thead>
            <tbody>
              {audit.botCrawlability.slice(0, 15).map((b) => (
                <tr key={b.path} className="border-t border-line-soft">
                  <td className="py-2 pr-4 font-mono text-xs">{b.path}</td>
                  <td className="py-2 pr-4">
                    {b.blockedByRobotsTxt ? (
                      <span className="text-critical text-xs font-semibold">Blocked</span>
                    ) : (
                      <span className="text-ready text-xs">Allowed</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-xs text-dim">{b.robotsMeta ?? '—'}</td>
                  <td className="py-2 text-xs text-dim">{b.aiBotMentioned ? 'Rules found' : 'No specific rules'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {audit.llmsTxt.preview && (
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-semibold text-ink mb-2">llms.txt preview</h3>
          <pre className="text-xs font-mono text-dim bg-surface-2 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">{audit.llmsTxt.preview}</pre>
        </div>
      )}
    </section>
  );
}
