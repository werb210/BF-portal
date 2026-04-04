import { getAuthToken } from '@/lib/authToken';
import { ApiError } from '@/api/http';
import { apiFetch } from '@/api/client';

const API_BASE = import.meta.env.VITE_API_URL;

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
};

type ApiFn = {
  <T = any>(path: string, options?: RequestOptions): Promise<T>;
  get<T = any>(path: string, options?: RequestOptions): Promise<T>;
  getList<T = any>(path: string, options?: RequestOptions): Promise<T[]>;
  post<T = any>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T = any>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T = any>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T = any>(path: string, options?: RequestOptions): Promise<T>;
};

function requiresAuth(path: string) {
  return !path.includes('/auth/');
}

function withQuery(path: string, params?: RequestOptions['params']) {
  if (!params) return path;
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return `${url.pathname}${url.search}`;
}

function parsePayload<T>(json: any): T {
  if (json && typeof json === 'object') {
    if ('data' in json) {
      return json.data as T;
    }
    if (json.status === 'error') {
      if (json.error === 'DB_NOT_READY') {
        return { degraded: true } as T;
      }
      throw new Error(json.error || 'API error');
    }
  }
  return json as T;
}

export async function rawApiFetch(path: string, options: RequestOptions = {}) {
  const token = getAuthToken();

  if (!token && requiresAuth(path)) {
    throw new Error('Auth token missing');
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestPath = withQuery(path, options.params);

  const body =
    options.body && !(options.body instanceof FormData)
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : (options.body as BodyInit | null | undefined);

  return fetch(`${API_BASE}${requestPath}`, {
    ...options,
    headers,
    credentials: 'include',
    body,
  });
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await rawApiFetch(path, options);

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError({ status: res.status, message: text || `API error ${res.status}` });
  }

  const json = await res.json();
  return parsePayload<T>(json);
}

export async function apiFetchWithRetry<T = any>(path: string, options: RequestInit = {}, retries = 1) {
  try {
    const data = await apiFetch(path, options);
    return { success: true, data } as const;
  } catch (error) {
    if (error instanceof TypeError) {
      return { success: false, error: error.message } as const;
    }

    if (retries > 0) {
      return apiFetchWithRetry<T>(path, options, retries - 1);
    }

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' } as const;
  }
}

const apiImpl = (async <T = any>(path: string, options: RequestOptions = {}) =>
  request<T>(path, options)) as ApiFn;

apiImpl.get = <T = any>(path: string, options: RequestOptions = {}) =>
  request<T>(path, { ...options, method: 'GET' });
apiImpl.getList = <T = any>(path: string, options: RequestOptions = {}) =>
  request<T[]>(path, { ...options, method: 'GET' });
apiImpl.post = <T = any>(path: string, body?: unknown, options: RequestOptions = {}) =>
  request<T>(path, { ...options, method: 'POST', body: body as BodyInit | null | undefined });
apiImpl.patch = <T = any>(path: string, body?: unknown, options: RequestOptions = {}) =>
  request<T>(path, { ...options, method: 'PATCH', body: body as BodyInit | null | undefined });
apiImpl.put = <T = any>(path: string, body?: unknown, options: RequestOptions = {}) =>
  request<T>(path, { ...options, method: 'PUT', body: body as BodyInit | null | undefined });
apiImpl.delete = <T = any>(path: string, options: RequestOptions = {}) =>
  request<T>(path, { ...options, method: 'DELETE' });

export const api = apiImpl;
export const http = apiImpl;
export const apiPost = apiImpl.post;

export type LenderAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type LenderApiClientConfig = {
  tokenProvider?: () => LenderAuthTokens | null;
  onTokensUpdated?: (nextTokens: LenderAuthTokens | null) => void;
  onUnauthorized?: () => void;
};

let lenderConfig: LenderApiClientConfig = {};

export function configureLenderApiClient(config: LenderApiClientConfig) {
  lenderConfig = config;
}

function lenderHeaders() {
  const nextTokens = lenderConfig.tokenProvider?.();
  return nextTokens?.accessToken ? { Authorization: `Bearer ${nextTokens.accessToken}` } : undefined;
}

export const lenderApiClient = {
  get: apiImpl.get,
  getList: apiImpl.getList,
  post: <T = any>(path: string, body?: unknown) =>
    apiImpl.post<T>(path, body, {
      headers: lenderHeaders(),
    }),
  patch: <T = any>(path: string, body?: unknown) =>
    apiImpl.patch<T>(path, body, {
      headers: lenderHeaders(),
    }),
  delete: apiImpl.delete,
};

export { ApiError };

export default apiImpl;
