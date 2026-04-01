import { apiDelete, apiGet, apiPatch, apiPost, apiPublicGet, apiPublicPost, apiPut } from "@/lib/apiClient";

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

const buildPath = (path: string, params?: RequestOptions["params"]) => {
  if (!path.startsWith("/api/")) {
    throw new Error(`Invalid API path (must start with /api/): ${path}`);
  }

  if (!params) return path;

  const url = new URL(path, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });

  return `${url.pathname}${url.search}`;
};

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  try {
    const { method = "GET", body, params, skipAuth } = options;
    const fullPath = buildPath(path, params);

    const data = await (async () => {
      if (method === "GET") return skipAuth ? apiPublicGet<T>(fullPath) : apiGet<T>(fullPath);
      if (method === "POST") return skipAuth ? apiPublicPost<T>(fullPath, body) : apiPost<T>(fullPath, body);
      if (method === "PUT") return apiPut<T>(fullPath, body);
      if (method === "PATCH") return apiPatch<T>(fullPath, body);
      if (method === "DELETE") return apiDelete<T>(fullPath);
      throw new Error(`Unsupported method: ${method}`);
    })();

    return { success: true, data };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Request failed" };
  }
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
