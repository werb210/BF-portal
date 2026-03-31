export type ApiSuccess<T = unknown> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  message: string;
};

export type ApiResult<T = unknown> = ApiSuccess<T> | ApiFailure;

export type RequestOptions = Omit<RequestInit, "body"> & {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  skipAuth?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const buildUrl = (path: string, params?: RequestOptions["params"]) => {
  const base = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  if (!params) return base;

  const url = new URL(base, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });

  if (base.startsWith("http")) return url.toString();
  return `${url.pathname}${url.search}`;
};

const toRequestBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
    return body;
  }
  return JSON.stringify(body);
};

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);

const delay = async (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { body, headers, params, skipAuth, signal, ...init } = options;
  const requestHeaders = new Headers(headers ?? {});
  const requestBody = toRequestBody(body);
  const endpoint = buildUrl(path, params);
  const startedAt = performance.now();
  const method = options.method ?? "GET";

  if (requestBody && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");
  if (!skipAuth && !requestHeaders.has("Authorization")) {
    if (!token) {
      return { success: false, message: "missing auth" };
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const requestAttempt = async (): Promise<ApiResult<T>> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });

    try {
      const response = await fetch(endpoint, {
        credentials: "include",
        ...init,
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      });

      const text = await response.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          return { success: false, message: "invalid response" };
        }
      }

      if (parsed && typeof parsed === "object" && "success" in parsed) {
        return parsed as ApiResult<T>;
      }

      if (response.ok) {
        return { success: true, data: parsed as T };
      }

      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        return { success: false, message: `retryable:${response.status}` };
      }

      return {
        success: false,
        message: (parsed as { message?: string } | null)?.message ?? response.statusText ?? "Request failed",
      };
    } catch (error) {
      if (isAbortError(error)) {
        return { success: false, message: "timeout" };
      }
      if (error instanceof TypeError) {
        return { success: false, message: "network error" };
      }
      return { success: false, message: error instanceof Error ? error.message : "network error" };
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abort);
    }
  };

  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    const result = await requestAttempt();
    const shouldRetry =
      !result.success &&
      (result.message === "timeout" ||
        result.message === "network error" ||
        result.message === "Failed to fetch" ||
        result.message.startsWith("retryable:"));
    if (!shouldRetry) {
      const duration = Math.round(performance.now() - startedAt);
      console.info("api.telemetry", { endpoint, method, durationMs: duration, success: result.success, attempt });
      return result;
    }

    if (attempt === MAX_RETRIES) {
      const duration = Math.round(performance.now() - startedAt);
      console.info("api.telemetry", { endpoint, method, durationMs: duration, success: false, attempt });
      return result;
    }

    const backoffMs = 100 * 2 ** attempt;
    await delay(backoffMs);
    attempt += 1;
  }

  const duration = Math.round(performance.now() - startedAt);
  console.info("api.telemetry", { endpoint, method, durationMs: duration, success: false, attempt });
  return { success: false, message: "Request failed" };
}

export const apiClient = {
  request: apiRequest,
  get: <T = unknown>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export const get = apiClient.get;
export const post = apiClient.post;
export const put = apiClient.put;
export const patch = apiClient.patch;
export const remove = apiClient.delete;

export const apiFetch = apiRequest;

export default apiClient;
