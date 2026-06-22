import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const PROVIDERS = [
  { id: 'perplexity', label: 'Perplexity', recommended: true, hint: 'Required for AI visibility runs' },
  { id: 'openai', label: 'OpenAI', recommended: false, hint: 'ChatGPT web search' },
  { id: 'gemini', label: 'Google Gemini', recommended: false, hint: 'Gemini grounding' },
  { id: 'serpapi', label: 'SerpAPI', recommended: false, hint: 'Google AI Overview' },
  { id: 'google_kg', label: 'Google Knowledge Graph', recommended: false, hint: 'Entity presence checks' },
] as const;

type KeyMeta = {
  provider: string;
  last4: string | null;
  valid: boolean;
  lastValidatedAt: string | null;
};

export function ApiKeysSection() {
  const [keys, setKeys] = useState<KeyMeta[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = () => {
    api.keys.list().then((res) => setKeys(res.keys)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const metaFor = (provider: string) =>
    keys.find((k) => k.provider === provider) ?? { provider, last4: null, valid: false, lastValidatedAt: null };

  const save = async (provider: string) => {
    const value = inputs[provider]?.trim();
    if (!value) return;
    setBusy(provider);
    setErrors((e) => ({ ...e, [provider]: '' }));
    try {
      await api.keys.save(provider, value);
      setInputs((i) => ({ ...i, [provider]: '' }));
      load();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [provider]: err instanceof Error ? err.message : 'Save failed',
      }));
    } finally {
      setBusy(null);
    }
  };

  const validate = async (provider: string) => {
    setBusy(`validate-${provider}`);
    setErrors((e) => ({ ...e, [provider]: '' }));
    try {
      const res = await api.keys.validate(provider);
      if (!res.valid) setErrors((e) => ({ ...e, [provider]: res.reason ?? 'Invalid key' }));
      load();
    } catch (err) {
      setErrors((e) => ({ ...e, [provider]: err instanceof Error ? err.message : 'Validation failed' }));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (provider: string) => {
    setBusy(`remove-${provider}`);
    await api.keys.remove(provider);
    load();
    setBusy(null);
  };

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-card p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold text-ink mb-1">API Keys</h2>
      <p className="text-sm text-dim mb-2">
        Bring your own keys — you pay your providers directly. Keys are encrypted at rest and never shown again after saving.
      </p>
      <p className="text-xs text-brand mb-6">
        A valid <strong>Perplexity</strong> key unlocks AI visibility tracking. Each additional key adds another engine.
      </p>

      {loading ? (
        <p className="text-sm text-dim">Loading…</p>
      ) : (
        <div className="space-y-5">
          {PROVIDERS.map((p) => {
            const meta = metaFor(p.id);
            const status = !meta.last4 ? 'not_set' : meta.valid ? 'valid' : 'invalid';
            return (
              <div key={p.id} className="border border-line rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-medium text-ink text-sm">{p.label}</span>
                  {p.recommended && (
                    <span className="text-[10px] uppercase tracking-wide bg-brand/10 text-brand px-2 py-0.5 rounded-full font-semibold">
                      Recommended
                    </span>
                  )}
                  <StatusPill status={status} />
                  {meta.last4 && (
                    <span className="text-xs text-faint font-mono">••••••••{meta.last4}</span>
                  )}
                  {meta.lastValidatedAt && (
                    <span className="text-xs text-faint">
                      Validated {new Date(meta.lastValidatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-dim mb-3">{p.hint}</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={meta.last4 ? 'Replace key…' : 'Paste API key…'}
                    value={inputs[p.id] ?? ''}
                    onChange={(e) => setInputs((i) => ({ ...i, [p.id]: e.target.value }))}
                    className="flex-1 min-w-[200px] border border-line rounded-xl px-3 py-2 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => save(p.id)}
                    disabled={busy === p.id || !(inputs[p.id]?.trim())}
                    className="text-sm font-semibold bg-brand text-white px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {busy === p.id ? 'Saving…' : 'Save'}
                  </button>
                  {meta.last4 && (
                    <>
                      <button
                        type="button"
                        onClick={() => validate(p.id)}
                        disabled={!!busy}
                        className="text-sm text-brand font-medium px-3 py-2 rounded-xl border border-brand/30 hover:bg-brand/5"
                      >
                        Validate
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        disabled={!!busy}
                        className="text-sm text-critical font-medium px-3 py-2"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
                {errors[p.id] && <p className="text-xs text-critical mt-2">{errors[p.id]}</p>}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-faint mt-6">
        Keys are used for AI visibility tracking — add them here when that feature is enabled.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: 'valid' | 'invalid' | 'not_set' }) {
  const styles = {
    valid: 'bg-ready/15 text-ready',
    invalid: 'bg-critical/15 text-critical',
    not_set: 'bg-faint/20 text-dim',
  };
  const labels = { valid: 'Valid', invalid: 'Invalid', not_set: 'Not set' };
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
