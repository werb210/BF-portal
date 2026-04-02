import { getEnv } from "@/config/env";
import { getToken } from "@/lib/authToken";
import { setApiStatus } from "@/state/apiStatus";

export class ApiError extends Error {
  status?: number;
  details?: unknown;
}

export type ApiClientOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | null | undefined>;
};

const withQuery = (path: string, params?: Record<string, string | number | boolean | null | undefined>) => {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path;
};

const buildUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  return `${getEnv().VITE_API_URL}${path}`;
};

const requiresAuth = (path: string) => !path.includes("/auth/") && !path.includes("/health");

const parseError = (payload: unknown): string => {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const rec = payload as { error?: unknown; message?: unknown };
    if (typeof rec.message === "string") return rec.message;
    if (typeof rec.error === "string") return rec.error;
    if (rec.error && typeof rec.error === "object" && "message" in (rec.error as Record<string, unknown>)) {
      const m = (rec.error as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
  }
  return "API_ERROR";
};

export async function api<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const token = getToken();
  if (requiresAuth(path) && !token) {
    throw new Error("MISSING_AUTH");
  }

  const { params, ...rest } = options;
  const url = buildUrl(withQuery(path, params));
  try {
    const res = await fetch(url, {
      method: rest.method ?? "GET",
      headers: {
        ...(rest.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers ?? {}),
      },
      body: rest.body === undefined ? undefined : rest.body instanceof FormData ? rest.body : JSON.stringify(rest.body),
      signal: rest.signal,
      credentials: "include",
    });

    if (!res.ok) {
      const err = new ApiError(`HTTP_ERROR_${res.status}`);
      err.status = res.status;
      throw err;
    }

    const payload = await res.json();
    if (payload?.status === "ok") {
      setApiStatus("available");
      return payload.data as T;
    }

    if (payload?.error === "DB_NOT_READY" || payload?.error?.code === "DB_NOT_READY") {
      setApiStatus("degraded");
      return { degraded: true } as T;
    }

    throw new Error(parseError(payload));
  } catch (error) {
    if (!(error instanceof Error && error.message === "MISSING_AUTH")) {
      setApiStatus("unavailable");
    }
    throw error;
  }
}

export async function apiFetch<T = unknown>(path: string, options: ApiClientOptions = {}) {
  try {
    return { success: true as const, data: await api<T>(path, options) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "API_ERROR" };
  }
}

export async function apiFetchWithRetry<T = unknown>(path: string, options: ApiClientOptions = {}, _retries = 0) {
  return apiFetch<T>(path, options);
}

export const get = <T = unknown>(path: string, options: ApiClientOptions = {}) => api<T>(path, { ...options, method: "GET" });
export const post = <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
  api<T>(path, { ...options, method: "POST", body: body ?? options.body });
export const patch = <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
  api<T>(path, { ...options, method: "PATCH", body: body ?? options.body });
export const put = <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
  api<T>(path, { ...options, method: "PUT", body: body ?? options.body });
export const del = <T = unknown>(path: string, options: ApiClientOptions = {}) => api<T>(path, { ...options, method: "DELETE" });

export const apiPost = post;

export const apiClient = Object.assign(api, {
  get,
  post,
  patch,
  put,
  delete: del,
  getList: <T = unknown>(path: string, options: ApiClientOptions = {}) => api<{ items: T[] }>(path, { ...options, method: "GET" }),
});

export default apiClient;
