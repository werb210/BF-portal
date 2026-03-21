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
  const path = endpoint in API_CONTRACT
    ? API_CONTRACT[endpoint as EndpointKey]
    : endpoint;
  const url = buildUrl(path);

  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = new ApiError(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  async get<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
    return parseResponse<T>(res);
  },
  async post<T = any>(path: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    const isFormData = body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(buildUrl(path), {
      method: 'POST',
      credentials: 'include',
      body: isFormData ? (body as FormData) : body == null ? undefined : JSON.stringify(body),
      ...options,
      headers,
    });
    return parseResponse<T>(res);
  },
  async patch<T = any>(path: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const res = await fetch(buildUrl(path), {
      method: 'PATCH',
      credentials: 'include',
      body: body == null ? undefined : JSON.stringify(body),
      ...options,
      headers,
    });
    return parseResponse<T>(res);
  },
  async delete<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
    return parseResponse<T>(res);
  },
};

export default api;
