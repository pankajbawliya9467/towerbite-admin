import { API_URL } from './config';
import { getToken } from './auth';

let cafeScope: string | null = null;

/** Super admins working inside a cafe send `x-cafe-id` on /v1/cafe calls. */
export function setCafeScope(cafeId: string | null) {
  cafeScope = cafeId;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (cafeScope && path.startsWith('/v1/cafe')) headers['x-cafe-id'] = cafeScope;
  if (body !== undefined && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? data?.message ?? 'Something went wrong', res.status);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: (path: string) => request<{ ok: true }>('DELETE', path),
  upload: (file: File, folder: string) => {
    const form = new FormData();
    form.append('folder', folder);
    form.append('file', file);
    return request<{ url: string; path: string }>('POST', '/v1/admin/upload', form);
  },
};

/** Builds a query string from the set values only. */
export function qs(params: Record<string, string | undefined>) {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
  return s ? `?${s}` : '';
}
