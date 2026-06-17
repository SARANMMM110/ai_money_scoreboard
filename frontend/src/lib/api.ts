const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  auth: {
    register: (email: string, password: string, name?: string) =>
      request<{ user: { id: string; email: string; name: string | null }; session: { access_token: string } }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify({ email, password, name }) },
      ),
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string; name: string | null }; session: { access_token: string } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    forgot: (email: string) =>
      request<{ message: string }>('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
    me: () => request<{ user: { id: string; email: string; name: string | null } }>('/auth/me'),
  },
  scans: {
    create: (url: string) => request<{ scanId: string }>('/scans', { method: 'POST', body: JSON.stringify({ url }) }),
    list: (params?: { search?: string; page?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      return       request<{ scans: import('../types').ScanSummary[]; total: number }>(`/scans?${q}`);
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
  },
};

export function setAuthToken(token: string) {
  localStorage.setItem('access_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('access_token');
}

export function getAuthToken() {
  return getToken();
}
