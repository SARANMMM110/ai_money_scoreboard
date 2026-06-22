const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.session?.access_token) return false;
      setAuthToken(data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem('refresh_token', data.session.refresh_token);
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Cannot reach the API — start the backend with: npm run dev -w backend');
  }

  if (res.status === 401 && !retried && path !== '/auth/refresh') {
    const refreshed = await tryRefreshSession();
    if (refreshed) return request<T>(path, options, true);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
      throw new Error(data.error ?? 'Session expired — please sign in again');
    }
    if (res.status === 500 && !data.error) {
      throw new Error('Cannot reach the API — start the backend with: npm run dev -w backend');
    }
    throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  auth: {
    register: (email: string, password: string, name?: string) =>
      request<{ user: { id: string; email: string; name: string | null }; session: { access_token: string; refresh_token?: string } }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify({ email, password, name }) },
      ),
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string; name: string | null }; session: { access_token: string; refresh_token?: string } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    forgot: (email: string) =>
      request<{ message: string }>('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
    me: () => request<{ user: { id: string; email: string; name: string | null } }>('/auth/me'),
  },
  scans: {
    create: (url: string) =>
      request<{ scanId: string }>('/scans', { method: 'POST', body: JSON.stringify({ url }) }),
    list: (params?: { search?: string; page?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      return request<{ scans: import('../types').ScanSummary[]; total: number }>(`/scans?${q}`);
    },
    get: (id: string) => request<import('../types').ScanResult>(`/scans/${id}`),
    status: (id: string) => request<import('../types').ScanStatus>(`/scans/${id}/status`),
    rescan: (id: string) => request<{ scanId: string }>(`/scans/${id}/rescan`, { method: 'POST' }),
    delete: (id: string) => request<{ message: string }>(`/scans/${id}`, { method: 'DELETE' }),
    compare: (a: string, b: string) =>
      request<{
        scanA: import('../types').ScanSummary;
        scanB: import('../types').ScanSummary;
        overallDelta: number;
        deltas: { category: string; label: string; scoreA: number; scoreB: number; delta: number; maxScore: number }[];
      }>(`/scans/compare?a=${a}&b=${b}`),
    generateReport: (id: string) =>
      request<{ pdfUrl: string; shareToken: string; reportId: string }>(`/scans/${id}/report`, { method: 'POST' }),
    downloadReportPdf: async (scanId: string) => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/reports/${scanId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Download failed (${res.status})`);
      }
      return res.blob();
    },
  },
  keys: {
    list: () =>
      request<{ keys: { provider: string; last4: string | null; valid: boolean; lastValidatedAt: string | null }[]; deepScanEligible: boolean }>(
        '/keys',
      ),
    save: (provider: string, apiKey: string) =>
      request<{ provider: string; last4: string; valid: boolean; reason?: string }>(`/keys/${provider}`, {
        method: 'PUT',
        body: JSON.stringify({ apiKey }),
      }),
    validate: (provider: string) =>
      request<{ valid: boolean; reason?: string }>(`/keys/${provider}/validate`, { method: 'POST' }),
    remove: (provider: string) =>
      request<{ message: string }>(`/keys/${provider}`, { method: 'DELETE' }),
  },
  brands: {
    list: () => request<{ brands: import('../visibility-types').Brand[] }>('/brands'),
    get: (id: string) => request<{ brand: import('../visibility-types').Brand }>(`/brands/${id}`),
    create: (data: Partial<import('../visibility-types').Brand> & { name: string; competitors?: { name: string; aliases?: string[]; domain?: string }[] }) =>
      request<{ brand: import('../visibility-types').Brand }>('/brands', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../visibility-types').Brand>) =>
      request<{ brand: import('../visibility-types').Brand }>(`/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/brands/${id}`, { method: 'DELETE' }),
    addCompetitor: (brandId: string, data: { name: string; aliases?: string[]; domain?: string }) =>
      request<{ competitor: import('../visibility-types').Competitor }>(`/brands/${brandId}/competitors`, { method: 'POST', body: JSON.stringify(data) }),
    removeCompetitor: (brandId: string, competitorId: string) =>
      request<{ message: string }>(`/brands/${brandId}/competitors/${competitorId}`, { method: 'DELETE' }),
    addPrompt: (brandId: string, data: { text: string; tag: string; enabled?: boolean }) =>
      request<{ prompt: import('../visibility-types').Prompt }>(`/brands/${brandId}/prompts`, { method: 'POST', body: JSON.stringify(data) }),
    updatePrompt: (brandId: string, promptId: string, data: Partial<import('../visibility-types').Prompt>) =>
      request<{ prompt: import('../visibility-types').Prompt }>(`/brands/${brandId}/prompts/${promptId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deletePrompt: (brandId: string, promptId: string) =>
      request<{ message: string }>(`/brands/${brandId}/prompts/${promptId}`, { method: 'DELETE' }),
    generatePrompts: (brandId: string, opts?: { limit?: number; replace?: boolean }) =>
      request<{ prompts: import('../visibility-types').Prompt[]; generated: number }>(
        `/brands/${brandId}/prompts/generate`,
        { method: 'POST', body: JSON.stringify(opts ?? {}) },
      ),
    entityPresence: (brandId: string) =>
      request<{ presence: { googleKnowledgeGraph: boolean; wikidata: boolean; wikipedia: boolean; details: Record<string, string | null> } }>(
        `/brands/${brandId}/entity`,
      ),
    engines: () => request<{ engines: string[] }>('/brands/meta/engines'),
  },
  visibility: {
    listRuns: (brandId: string) =>
      request<{ runs: import('../visibility-types').VisibilityRunSummary[] }>(`/visibility/brands/${brandId}/runs`),
    estimate: (brandId: string) =>
      request<import('../visibility-types').RunEstimate>(`/visibility/brands/${brandId}/estimate`),
    startRun: (brandId: string) =>
      request<{ runId: string }>(`/visibility/brands/${brandId}/runs`, { method: 'POST' }),
    getRun: (runId: string) =>
      request<{ run: import('../visibility-types').VisibilityRunDetail }>(`/visibility/runs/${runId}`),
    runStatus: (runId: string) =>
      request<import('../visibility-types').VisibilityRunSummary>(`/visibility/runs/${runId}/status`),
    getSchedule: (brandId: string) =>
      request<{ schedule: { frequency: string; enabled: boolean; alertThreshold: number | null } | null }>(
        `/visibility/brands/${brandId}/schedule`,
      ),
    setSchedule: (brandId: string, data: { frequency: string; enabled: boolean; alertThreshold?: number }) =>
      request<{ schedule: unknown }>(`/visibility/brands/${brandId}/schedule`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};

export function setAuthToken(token: string) {
  localStorage.setItem('access_token', token);
}

export function setRefreshToken(token: string | null | undefined) {
  if (token) localStorage.setItem('refresh_token', token);
  else localStorage.removeItem('refresh_token');
}

export function clearAuthToken() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function getAuthToken() {
  return getToken();
}
