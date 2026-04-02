import { getEnv } from "../config/env";
import { getToken } from "../lib/authToken";
import { setApiStatus } from "../state/apiStatus";

type ApiResponse<T> = {
  status: "ok" | "error" | "not_ready";
  data?: T;
  error?: string;
  rid?: string;
};

export type RequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | null | undefined>;
};

export type LenderAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export class ApiError extends Error {
  status?: number;
  details?: unknown;
}

const withQuery = (path: string, params?: RequestOptions["params"]) => {
  if (!params) return path;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
};

const requiresAuth = (path: string) => !path.includes("/auth/") && !path.includes("/health");
const buildUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${getEnv().VITE_API_URL}${path}`);

export async function api<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
  const token = getToken();

  if (requiresAuth(path) && !token) {
    throw new Error("MISSING_AUTH");
  }

  const requestPath = withQuery(path, options?.params);
  const res = await fetch(buildUrl(requestPath), {
    method: options?.method || "GET",
    headers: {
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    body:
      options?.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const error = new ApiError(`HTTP_ERROR_${res.status}`);
    error.status = res.status;
    setApiStatus("unavailable");
    throw error;
  }

  const json: ApiResponse<T> = await res.json();

  if (json.status === "ok") {
    setApiStatus("available");
    return json.data as T;
  }

  if (json.error === "DB_NOT_READY") {
    setApiStatus("degraded");
    return { degraded: true } as T;
  }

  setApiStatus("unavailable");
  throw new Error(json.error || "API error");
}

export const get = <T = unknown>(path: string, options?: RequestOptions) => api<T>(path, { ...options, method: "GET" });
export const post = <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
  api<T>(path, { ...options, method: "POST", ...(body !== undefined ? { body } : {}) });
export const patch = <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
  api<T>(path, { ...options, method: "PATCH", ...(body !== undefined ? { body } : {}) });
export const put = <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
  api<T>(path, { ...options, method: "PUT", ...(body !== undefined ? { body } : {}) });
export const del = <T = unknown>(path: string, options?: RequestOptions) => api<T>(path, { ...options, method: "DELETE" });

export async function apiFetch<T = unknown>(path: string, options?: RequestOptions) {
  try {
    return { success: true as const, data: await api<T>(path, options) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "API error" };
  }
}

export async function apiFetchWithRetry<T = unknown>(path: string, options?: RequestOptions, _retries = 0) {
  return apiFetch<T>(path, options);
}

export const apiPost = post;

export const apiClient = Object.assign(api, {
  get,
  post,
  patch,
  put,
  delete: del,
  getList: <T = unknown>(path: string, options?: RequestOptions) => api<{ items: T[] }>(path, { ...options, method: "GET" }),
});

export const http = apiClient;
export const lenderApiClient = apiClient;
export const configureLenderApiClient = (_config: {
  tokenProvider: () => LenderAuthTokens | null;
  onTokensUpdated?: (tokens: LenderAuthTokens | null) => void;
  onUnauthorized?: () => void;
}) => undefined;

export default apiClient;
