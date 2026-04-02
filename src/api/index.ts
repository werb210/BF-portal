import { apiFetch as coreFetch } from "./client";
import { setApiStatus } from "@/state/apiStatus";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

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

const requiresAuth = (path: string) => !path.includes("/auth/") && !path.includes("/health");

const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token") || localStorage.getItem(import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token");
};

const withParams = (path: string, params?: RequestOptions["params"]) => {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path;
};

const toRelativeApiPath = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    const parsed = new URL(path);
    return parsed.pathname + parsed.search;
  }
  return path;
};

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}) {
  const res = await coreFetch(`${BASE}${toRelativeApiPath(path)}`, options);
  const json = (await res.json()) as { status?: string; data?: T; error?: string };

  if (json?.status === "ok") {
    return { success: true, data: (json.data ?? ({} as T)) as T };
  }

  return { success: false, error: json?.error ?? "Request failed" };
}

export async function rawApiFetch(path: string, options: RequestInit = {}) {
  return coreFetch(`${BASE}${toRelativeApiPath(path)}`, options);
}

export function get(path: string, headers: any = {}) {
  return coreFetch(`${BASE}${path}`, {
    method: "GET",
    headers,
  });
}

export function post(path: string, body: any, headers: any = {}) {
  return coreFetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new Error("Invalid JSON response");
  }
}

async function baseApi<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const normalizedPath = toRelativeApiPath(path);
  const token = getStoredToken();

  if (!token && requiresAuth(normalizedPath)) {
    throw new Error("Auth token missing");
  }

  const requestPath = withParams(normalizedPath, options.params);
  const res = await coreFetch(`${BASE}${requestPath}`, {
    method: options.method || "GET",
    headers: options.headers,
    ...(options.body === undefined
      ? {}
      : {
          body: options.body instanceof FormData ? options.body : JSON.stringify(options.body),
        }),
    signal: options.signal,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem(import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const json = (await safeJson(res)) as { status?: string; data?: T; error?: string };

  if (json?.status === "error" && json.error === "DB_NOT_READY") {
    setApiStatus("degraded");
    return { degraded: true } as T;
  }

  if (!res.ok || json?.status !== "ok") {
    const err = new ApiError(json?.error || `HTTP_ERROR_${res.status}`);
    err.status = res.status;
    err.details = json;
    setApiStatus("unavailable");
    throw err;
  }

  setApiStatus("available");
  return (json.data ?? ({} as T)) as T;
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

export const apiPost = api.post;
export const del = api.delete;
export const put = api.put;
export const patch = api.patch;

export async function apiFetchWithRetry<T = unknown>(path: string, options?: RequestInit, _retries = 0) {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Request failed" };
  }
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
