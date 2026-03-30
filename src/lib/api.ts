import { ApiError } from "@/api/http";

const API_BASE = import.meta.env.VITE_API_URL || "https://server.boreal.financial";

type LegacyMethod = "get" | "post" | "put" | "patch" | "delete";

type ApiOptions = RequestInit & {
  raw?: boolean;
  responseType?: "json" | "text" | "blob";
  skipAuth?: boolean;
};

export type ApiResult<T = unknown> = {
  data: T;
  status: number;
  headers: Headers;
};

const normalizePath = (path: string) => {
  if (!path.startsWith("/")) return `/api/${path}`;
  if (path.startsWith("/api/")) return path;
  return `/api${path}`;
};

const normalizeMethod = (method?: string): string => (method ?? "GET").toUpperCase();

const shouldSetJsonContentType = (body: BodyInit | null | undefined) => {
  if (!body) return true;
  return !(body instanceof FormData);
};

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<unknown> {
  const normalizedPath = normalizePath(path);
  const method = normalizeMethod(options.method);

  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && shouldSetJsonContentType(options.body ?? null)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${normalizedPath}`, {
    credentials: "include",
    ...options,
    method,
    headers,
  });

  if (options.raw) return response;

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);
    const message = typeof body === "string" ? body : JSON.stringify(body);
    throw new ApiError({
      status: response.status,
      message: `API ${response.status}: ${message || response.statusText || "Request failed"}`,
      details: body,
    });
  }

  if (options.responseType === "blob") return response.blob();
  if (options.responseType === "text") return response.text();

  if (options.responseType === "json") return response.json();
  if (isJson) return response.json();

  return response.text();
}

const request = async <T = unknown>(method: string, path: string, data?: unknown, options: ApiOptions = {}): Promise<ApiResult<T>> => {
  const body = data === undefined ? options.body : data instanceof FormData ? data : JSON.stringify(data);
  const parsed = (await apiFetch(path, { ...options, method, body })) as T;
  return { data: parsed, status: 200, headers: new Headers() };
};

const api = {
  defaults: { baseURL: API_BASE },
  get: async <T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> => request<T>("GET", path, undefined, options),
  post: async <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}): Promise<ApiResult<T>> => request<T>("POST", path, data, options),
  put: async <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}): Promise<ApiResult<T>> => request<T>("PUT", path, data, options),
  patch: async <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}): Promise<ApiResult<T>> => request<T>("PATCH", path, data, options),
  delete: async <T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> => request<T>("DELETE", path, undefined, options),
};

export async function apiRequest<T = unknown>(url: string, config?: ApiOptions & { data?: unknown }): Promise<T>;
export async function apiRequest<T = unknown>(method: LegacyMethod, url: string, data?: unknown, _auth?: boolean): Promise<T>;
export async function apiRequest<T = unknown>(
  methodOrUrl: string,
  urlOrConfig: string | (ApiOptions & { data?: unknown }) = {},
  data?: unknown,
): Promise<T> {
  const isLegacyMethod = ["get", "post", "put", "patch", "delete"].includes(methodOrUrl);

  if (isLegacyMethod) {
    const response = await request<T>(methodOrUrl.toUpperCase(), urlOrConfig as string, data);
    return response.data;
  }

  const url = methodOrUrl;
  const config = (urlOrConfig ?? {}) as ApiOptions & { data?: unknown };
  const response = await request<T>(config.method ?? "GET", url, config.data, config);
  return response.data;
}

export async function safeApiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T | null> {
  try {
    const response = await request<T>(options.method ?? "GET", path, undefined, options);
    return response.data;
  } catch {
    return null;
  }
}

export { ApiError };
export default api;
