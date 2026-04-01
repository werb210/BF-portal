import { apiClient as strictApiClient } from "@/lib/apiClient";

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

const buildPath = (path: string, params?: RequestOptions["params"]): string => {
  if (!params) return path;
  const url = new URL(path, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
};

const toBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
};

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return "API_ERROR";
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const data = (await strictApiClient(path, options)) as T;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }
}

export async function apiFetchWithRetry<T>(
  path: string,
  options: RequestInit = {},
  retries = 1,
): Promise<ApiResult<T>> {
  const result = await apiFetch<T>(path, options);
  if (result.success || retries <= 0) return result;
  return apiFetchWithRetry<T>(path, options, retries - 1);
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, params, skipAuth, ...rest } = options;
  const fullPath = buildPath(path, params);

  try {
    const headers = new Headers(rest.headers || {});
    if (skipAuth) {
      headers.set("X-Skip-Auth", "1");
    }

    const data = (await strictApiClient(fullPath, {
      ...rest,
      method,
      headers,
      body: toBody(body),
    })) as T;

    return { success: true, data };
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }
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
