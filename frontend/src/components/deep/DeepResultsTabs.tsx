import { useState } from 'react';
import type { DeepVisibilityData, ScanResult } from '../../types';
import { DeepVisibilityReport } from './DeepVisibilityReport';

type Tab = 'readiness' | 'visibility';

export function DeepResultsTabs({
  scan,
  readinessContent,
}: {
  scan: ScanResult;
  readinessContent: React.ReactNode;
}) {
  const isDeep = scan.scanMode === 'deep';
  const [tab, setTab] = useState<Tab>('readiness');

  if (!isDeep) {
    return <>{readinessContent}</>;
  }

  const tabs: { id: Tab; label: string; sub: string }[] = [
    { id: 'readiness', label: 'Verified readiness', sub: 'Validated signals · same 7-category rubric' },
    { id: 'visibility', label: 'AI visibility', sub: 'Live engine queries · measured snapshot' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-8 p-1.5 bg-surface-2 border border-line rounded-2xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 text-left px-4 py-3 rounded-xl transition-all ${
              tab === t.id
                ? 'bg-surface shadow-card border border-line'
                : 'hover:bg-surface/60 border border-transparent'
            }`}
          >
            <p className={`text-sm font-semibold ${tab === t.id ? 'text-ink' : 'text-dim'}`}>{t.label}</p>
            <p className="text-[10px] text-faint mt-0.5">{t.sub}</p>
          </button>
        ))}
      </div>

      {tab === 'readiness' && readinessContent}

      {tab === 'visibility' && (
        <DeepVisibilityReport
          data={scan.deepVisibility as DeepVisibilityData | null}
          deepStatus={scan.deepStatus}
          deepError={scan.deepError}
        />
      )}
    </div>
  );
}
