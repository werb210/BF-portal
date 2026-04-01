import { apiRequest as coreApiRequest, type ApiResult, type RequestOptions } from "@/api/client";

function toRequestOptions(options: RequestInit = {}): RequestOptions {
  return {
    ...options,
    skipAuth: true,
  };
}

function unwrapApiResult<T>(path: string, result: ApiResult<T>): T {
  if (result.success) {
    return result.data;
  }

  const reason = result.error ?? result.message ?? "unknown error";
  console.error("API_ERROR", { path, reason });
  throw new Error(`API request failed: ${reason}`);
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const result = await coreApiRequest<T>(normalizedPath, toRequestOptions(options));
  return unwrapApiResult(normalizedPath, result);
}

export async function safeApiRequest<T = any>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (err) {
    console.error("API_FAILURE", path, err);
    throw err;
  }
}

export const apiGet = <T = any>(path: string) => apiRequest<T>(path, { method: "GET" });
export const apiPost = <T = any>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const apiPut = <T = any>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const apiPatch = <T = any>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const apiDelete = <T = any>(path: string) => apiRequest<T>(path, { method: "DELETE" });

export const apiPublicGet = apiGet;
export const apiPublicPost = apiPost;
