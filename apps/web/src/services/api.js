const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

let refreshPromise = null;

async function request(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? { ...options.headers } : { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, options);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      const isServicer = window.location.pathname.startsWith('/servicer');
      window.location.href = isServicer ? '/servicer/login' : '/login';
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Request failed (${res.status})`);
  }
  if (!res.ok) throw new Error(data?.error?.message || 'Request failed');
  return data;
}

async function tryRefresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefresh() {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  patch: (path, body, opts) => request(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
