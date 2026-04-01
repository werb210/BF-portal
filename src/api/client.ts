import { getToken } from "@/auth/token";

export type ApiSuccess<T = unknown> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  message?: string;
  error?: string;
};

export type ApiResult<T = unknown> = ApiSuccess<T> | ApiFailure;

export type RequestOptions = Omit<RequestInit, "body"> & {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  skipAuth?: boolean;
};

const buildPath = (path: string, params?: RequestOptions["params"]) => {
  if (!params) return path;

  const url = new URL(path, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });

  return `${url.pathname}${url.search}`;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ success: true; data: T } | { success: false; message?: string; error?: string }> {
  try {
    if (!path.startsWith("/api/")) {
      return { success: false, error: "invalid api path" };
    }

    const token = getToken();
    if (!token) {
      return { success: false, message: "missing auth" };
    }

    const res = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 204) {
      return { success: true, data: null as T };
    }

    let json: any = null;

    try {
      json = await res.json();
    } catch {
      return { success: false, message: "invalid response" };
    }

    if (!res.ok || json?.success === false) {
      return {
        success: false,
        message: json?.message || json?.error || "request failed",
      };
    }

    return {
      success: true,
      data: json?.data ?? json,
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { success: false, message: "timeout" };
    }

    return { success: false, error: "network error" };
  }
}

export async function apiFetchWithRetry<T>(path: string, options: RequestInit = {}, retries = 1): Promise<ApiResult<T>> {
  const result = await apiFetch<T>(path, options);

  if (result.success) {
    return result;
  }

  if (retries > 0 && !result.success) {
    const retriable =
      result.error === "network error" || result.message === "invalid response" || result.message === "request failed";

    if (retriable) {
      return apiFetchWithRetry<T>(path, options, retries - 1);
    }
  }

  return result;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, params, skipAuth, ...rest } = options;

  if (!skipAuth && !getToken()) {
    return { success: false, error: "missing auth" };
  }

  const fullPath = buildPath(path, params);

  if (skipAuth) {
    try {
      if (!fullPath.startsWith("/api/")) {
        return { success: false, error: "invalid api path" };
      }

      const payload = body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body);
      const headers: HeadersInit = payload instanceof FormData ? { ...(rest.headers || {}) } : { ...(rest.headers || {}), "Content-Type": "application/json" };
      const response = await fetch(fullPath, { ...rest, method, body: payload as BodyInit | null | undefined, headers });

      if (response.status === 204) {
        return { success: true, data: null as T };
      }

      let json: any = null;
      try {
        json = await response.json();
      } catch {
        return { success: false, message: "invalid response" };
      }

      if (!response.ok || json?.success === false) {
        return { success: false, message: json?.message || json?.error || "request failed" };
      }

      return { success: true, data: (json?.data ?? json) as T };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return { success: false, message: "timeout" };
      }
      return { success: false, error: "network error" };
    }
  }

  const payload = body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body);
  const headers: HeadersInit = payload instanceof FormData ? { ...(rest.headers || {}) } : { ...(rest.headers || {}), "Content-Type": "application/json" };

  const result = await apiFetchWithRetry<T>(fullPath, {
    ...rest,
    method,
    body: payload as BodyInit | null | undefined,
    headers,
  });

  if (!result.success && result.message && !result.error) {
    return { success: false, error: result.message };
  }

  return result;
}

export const apiClient = {
  request: apiRequest,
  get: <T = unknown>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export const get = apiClient.get;
export const post = apiClient.post;
export const put = apiClient.put;
export const patch = apiClient.patch;
export const remove = apiClient.delete;

export default apiClient;
