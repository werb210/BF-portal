import { API_BASE_URL } from "@/config/api";

export const API_BASE = API_BASE_URL;

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: any;
};

const request = async <T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const token = localStorage.getItem('token');
  const body =
    options.body !== undefined && typeof options.body !== 'string' && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body;
  const isFormData = body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    body,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    throw new ApiError(`API error ${res.status}`, res.status);
  }

  return (await res.json()) as T;
};

export async function apiRequest<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return request<T>(path, options);
}

export async function safeApiFetch<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T | null> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

const api = {
  get: <T = any>(path: string, options: ApiRequestOptions = {}) => request<T>(path, options),
  post: <T = any>(path: string, body?: any, options: ApiRequestOptions = {}) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  patch: <T = any>(path: string, body?: any, options: ApiRequestOptions = {}) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  delete: <T = any>(path: string, options: ApiRequestOptions = {}) =>
    request<T>(path, {
      ...options,
      method: 'DELETE'
    })
};

export default api;
