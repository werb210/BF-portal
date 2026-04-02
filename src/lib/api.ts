import { getEnv } from "../config/env";
import { clearToken, getToken } from "@/lib/authStore";
import { setApiStatus } from "../state/apiStatus";

export type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | null | undefined>;
};

export class ApiError extends Error {
  status?: number;
  details?: unknown;
}

export type LenderAuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

type ApiEnvelope<T> = {
  status: "ok" | string;
  data?: T;
  error?: string;
};

const { VITE_API_URL } = getEnv();
const requiresAuth = (path: string) => !path.includes("/auth/") && !path.includes("/health");

const appendParams = (url: string, params?: RequestOptions["params"]) => {
  if (!params) return url;
  const parsed = new URL(url, url.startsWith("http") ? undefined : VITE_API_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    parsed.searchParams.set(key, String(value));
  });
  return /^https?:\/\//.test(url) ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
};

const buildUrl = (path: string, params?: RequestOptions["params"]) => {
  const full = /^https?:\/\//.test(path) ? path : `${VITE_API_URL}${path}`;
  return appendParams(full, params);
};

async function baseApi<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  if (!token && !path.includes("/auth")) {
    throw new Error("Auth token missing");
  }

  const res = await fetch(buildUrl(path, options.params), {
    method: options.method || "GET",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...(options.body === undefined
      ? {}
      : {
          body: options.body instanceof FormData ? options.body : JSON.stringify(options.body),
        }),
    signal: options.signal,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const json: unknown = await res.json();

  if (!json || typeof json !== "object" || !('status' in json)) {
    setApiStatus("unavailable");
    throw new Error("Invalid API response");
  }

  const payload = json as ApiEnvelope<T>;

  if (payload.status === "error" && payload.error === "DB_NOT_READY") {
    setApiStatus("degraded");
    return { degraded: true } as T;
  }

  if (!res.ok || payload.status !== "ok") {
    const errorMessage = typeof payload.error === "string" && payload.error.length > 0 ? payload.error : `HTTP_ERROR_${res.status}`;
    const err = new ApiError(errorMessage);
    err.status = res.status;
    err.details = payload;
    setApiStatus("unavailable");
    throw err;
  }

  setApiStatus("available");
  return payload.data as T;
}

type NoMethodBody = Omit<RequestOptions, "method" | "body">;

export type ApiFn = (<T = unknown>(path: string, options?: RequestOptions) => Promise<T>) & {
  get: <T = unknown>(path: string, options?: NoMethodBody) => Promise<T>;
  post: <T = unknown>(path: string, body?: unknown, options?: NoMethodBody) => Promise<T>;
  patch: <T = unknown>(path: string, body?: unknown, options?: NoMethodBody) => Promise<T>;
  put: <T = unknown>(path: string, body?: unknown, options?: NoMethodBody) => Promise<T>;
  delete: <T = unknown>(path: string, options?: NoMethodBody) => Promise<T>;
  getList: <T = unknown>(path: string, options?: NoMethodBody) => Promise<T[]>;
};

export const api = Object.assign(baseApi, {
  get: <T = unknown>(path: string, options?: NoMethodBody) => baseApi<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: NoMethodBody) =>
    baseApi<T>(path, { ...options, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: NoMethodBody) =>
    baseApi<T>(path, { ...options, method: "PATCH", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: NoMethodBody) =>
    baseApi<T>(path, { ...options, method: "PUT", body }),
  delete: <T = unknown>(path: string, options?: NoMethodBody) => baseApi<T>(path, { ...options, method: "DELETE" }),
  getList: <T = unknown>(path: string, options?: NoMethodBody) => baseApi<T[]>(path, { ...options, method: "GET" }),
}) as ApiFn;

export const get = api.get;
export const post = api.post;
export const patch = api.patch;
export const put = api.put;
export const del = api.delete;
export const apiPost = api.post;

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

let lenderTokenProvider: (() => LenderAuthTokens | null) | null = null;
let lenderOnUnauthorized: (() => void) | null = null;
let lenderOnTokensUpdated: ((tokens: LenderAuthTokens | null) => void) | null = null;

export function configureLenderApiClient(config: {
  tokenProvider: () => LenderAuthTokens | null;
  onUnauthorized?: () => void;
  onTokensUpdated?: (tokens: LenderAuthTokens | null) => void;
}) {
  lenderTokenProvider = config.tokenProvider;
  lenderOnUnauthorized = config.onUnauthorized ?? null;
  lenderOnTokensUpdated = config.onTokensUpdated ?? null;
}

export const lenderApiClient = {
  get: api.get,
  post: api.post,
  patch: api.patch,
  put: api.put,
  delete: api.delete,
  getList: api.getList,
};

void lenderTokenProvider;
void lenderOnUnauthorized;
void lenderOnTokensUpdated;

export const http = api;
export default api;
