export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const TOKEN = 'lk_token';
const REFRESH = 'lk_refresh';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
export { ls };

export function setTokens(t: { token: string; refreshToken: string } | null) {
  ls.set(TOKEN, t?.token ?? null);
  ls.set(REFRESH, t?.refreshToken ?? null);
}
export const hasToken = () => !!ls.get(TOKEN);

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const rt = ls.get(REFRESH);
  if (!rt) return false;
  refreshing ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) })
    .then(async (r) => { if (!r.ok) return false; setTokens(await r.json()); return true; })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

export let onUnauthorized = () => {};
export function setOnUnauthorized(fn: () => void) { onUnauthorized = fn; }

export async function api<T = any>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  const token = ls.get(TOKEN);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401 && retry && token) {
    if (await refresh()) return api(path, body, method, false);
    setTokens(null);
    onUnauthorized();
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 429) throw new ApiError('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.', 429);
  if (!res.ok) throw new ApiError(Array.isArray(json.message) ? json.message[0] : json.message ?? 'Terjadi kesalahan', res.status);
  return json as T;
}
