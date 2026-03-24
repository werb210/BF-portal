import { API_CONTRACT } from '@/contracts/api.contract';

export class ApiError extends Error {
  status?: number;
}

export const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error('Missing VITE_API_URL');
}

export function buildUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }
  return `${API_BASE}${path}`;
}

function resolveApiPath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }
  return path.startsWith('/api/') ? path : `/api${path}`;
}

function readAuthToken(): string | null {
  return localStorage.getItem('token');
}

type EndpointKey = keyof typeof API_CONTRACT;

export async function apiFetch<
  K extends EndpointKey,
  T = any
>(
  endpoint: K,
  options?: RequestInit
): Promise<T>;
export async function apiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T>;
export async function apiFetch<T = any>(
  endpoint: EndpointKey | string,
  options?: RequestInit
): Promise<T> {
  const rawPath = endpoint in API_CONTRACT
    ? API_CONTRACT[endpoint as EndpointKey]
    : endpoint;
  const path = resolveApiPath(rawPath);
  const url = buildUrl(path);
  const token = readAuthToken();
  const headers = new Headers(options?.headers || {});
  const isFormData = options?.body instanceof FormData;

  if (!token && path.startsWith('/api/') && !path.includes('/auth/')) {
    throw new Error('Missing auth token');
  }

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    credentials: 'include',
    headers,
    ...options,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.error || 'Request failed');
  }

  if (!json || json.ok !== true || !('data' in json)) {
    throw new Error('Invalid API response');
  }

  return json.data as T;
}

export async function safeApiFetch<T = any>(
  endpoint: EndpointKey | string,
  options?: RequestInit
): Promise<T | null> {
  try {
    return await apiFetch<T>(endpoint, options);
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

export const api = {
  async get<T = any>(path: string, options: RequestInit = {}): Promise<{ data: T }> {
    const data = await apiFetch<T>(path, { ...options, method: 'GET' });
    return { data };
  },
  async post<T = any>(path: string, body?: unknown, options: RequestInit = {}): Promise<{ data: T }> {
    const isFormData = body instanceof FormData;
    const data = await apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: isFormData ? (body as FormData) : body == null ? undefined : JSON.stringify(body),
    });
    return { data };
  },
  async patch<T = any>(path: string, body?: unknown, options: RequestInit = {}): Promise<{ data: T }> {
    const data = await apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body == null ? undefined : JSON.stringify(body),
    });
    return { data };
  },
  async delete<T = any>(path: string, options: RequestInit = {}): Promise<{ data: T }> {
    const data = await apiFetch<T>(path, { ...options, method: 'DELETE' });
    return { data };
  },
};

export default api;
