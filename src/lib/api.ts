import { API_CONTRACT } from '@/contracts';

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

export async function apiFetch<T = Response>(
  endpoint: keyof typeof API_CONTRACT,
  options: RequestInit = {}
): Promise<T> {
  const path = API_CONTRACT[endpoint];
  const url = buildUrl(path);

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  return response as T;
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
  async get<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await apiFetch<Response>(path as keyof typeof API_CONTRACT, {
      method: 'GET',
      ...options,
    });
    return parseResponse<T>(res);
  },
  async post<T = unknown>(path: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    const isFormData = body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await apiFetch<Response>(path as keyof typeof API_CONTRACT, {
      method: 'POST',
      body: isFormData ? (body as FormData) : body == null ? undefined : JSON.stringify(body),
      ...options,
      headers,
    });
    return parseResponse<T>(res);
  },
  async patch<T = unknown>(path: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const res = await apiFetch<Response>(path as keyof typeof API_CONTRACT, {
      method: 'PATCH',
      body: body == null ? undefined : JSON.stringify(body),
      ...options,
      headers,
    });
    return parseResponse<T>(res);
  },
  async delete<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await apiFetch<Response>(path as keyof typeof API_CONTRACT, {
      method: 'DELETE',
      ...options,
    });
    return parseResponse<T>(res);
  },
};

export default api;
