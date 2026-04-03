import { setApiStatus } from "@/state/apiStatus";
import { apiCall } from "@/lib/api";

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

/**
 * Core API wrapper
 */
export async function baseApi<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const requestPath = withParams(toRelativeApiPath(path), options.params);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };


  const body =
    options.body === undefined
      ? undefined
      : options.body instanceof FormData
        ? options.body
        : typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);

  let data: unknown;
  try {
    data = await apiCall(requestPath, {
      method: options.method || "GET",
      headers: options.body instanceof FormData ? (options.headers as Record<string, string> | undefined) : headers,
      body: body as BodyInit | null | undefined,
      signal: options.signal,
    });
  } catch (error) {
    setApiStatus("unavailable");
    const err = new ApiError(error instanceof Error ? error.message : "API error");
    throw err;
  }

  if ((data as { status?: string; error?: string } | null)?.status === "error" && (data as { error?: string } | null)?.error === "DB_NOT_READY") {
    setApiStatus("degraded");
    return { degraded: true } as T;
  }

  setApiStatus("available");

  if (data && typeof data === "object" && "status" in (data as Record<string, unknown>)) {
    const wrapped = data as { status?: string; data?: T; error?: string };
    if (wrapped.status === "ok") {
      return (wrapped.data ?? ({} as T)) as T;
    }
  }

  return data as T;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}) {
  try {
    const data = await baseApi<T>(path, {
      method: options.method,
      body: options.body,
      headers: options.headers as Record<string, string> | undefined,
      signal: options.signal ?? undefined,
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Request failed" };
  }
}

export async function rawApiFetch(path: string, options: RequestInit = {}) {
  try {
    const data = await apiCall(path, options);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "API error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export function get(path: string, headers: Record<string, string> = {}) {
  return rawApiFetch(path, {
    method: "GET",
    headers,
  });
}

export function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return rawApiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
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
