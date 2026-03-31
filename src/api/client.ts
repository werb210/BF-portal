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

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { body, headers, params, ...init } = options;
  const requestHeaders = new Headers(headers ?? {});
  const requestBody = toRequestBody(body);

  if (requestBody && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(buildUrl(path, params), {
      credentials: "include",
      ...init,
      method: options.method ?? "GET",
      headers: requestHeaders,
      body: requestBody,
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;

    if (parsed && typeof parsed === "object" && "success" in parsed) {
      return parsed as ApiResult<T>;
    }

    if (response.ok) {
      return { success: true, data: parsed as T };
    }

    return { success: false, message: (parsed as { message?: string } | null)?.message ?? response.statusText ?? "Request failed" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Network error" };
  }
}

const unwrap = async <T>(path: string, options: RequestOptions = {}): Promise<T | null> => {
  const result = await apiRequest<T>(path, options);
  return result.success ? result.data : null;
};

export const apiClient = {
  request: apiRequest,
  get: <T = unknown>(path: string, options?: RequestOptions) => unwrap<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => unwrap<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => unwrap<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => unwrap<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: RequestOptions) => unwrap<T>(path, { ...options, method: "DELETE" }),
};

export const get = apiClient.get;
export const post = apiClient.post;
export const put = apiClient.put;
export const patch = apiClient.patch;
export const remove = apiClient.delete;

export const apiFetch = apiRequest;

export default apiClient;
