import { API_BASE_URL } from "@/config/api";
import { apiRequest as coreApiRequest, type ApiRequestOptions } from "@/lib/apiClient";

let token: string | null = typeof window === "undefined" ? null : localStorage.getItem("token");

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function setToken(t: string) {
  token = t;
  if (typeof window !== "undefined") localStorage.setItem("token", t);
}

export function clearToken() {
  token = null;
  if (typeof window !== "undefined") localStorage.removeItem("token");
}

export function getToken() {
  return token;
}

type ApiOptions = ApiRequestOptions & { data?: unknown };

function normalizeBody(data: unknown, body: BodyInit | null | undefined) {
  if (data !== undefined) return data instanceof FormData ? data : JSON.stringify(data);
  return body;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  return coreApiRequest(path, {
    ...options,
    body: normalizeBody(options.data, options.body),
  });
}

export async function apiRequest<T = unknown>(url: string, config?: ApiOptions): Promise<T>;
export async function apiRequest<T = unknown>(method: "get" | "post" | "put" | "patch" | "delete", url: string, data?: unknown): Promise<T>;
export async function apiRequest<T = unknown>(
  methodOrUrl: string,
  urlOrConfig: string | ApiOptions = {},
  data?: unknown,
): Promise<T> {
  const legacyMethods = ["get", "post", "put", "patch", "delete"];
  if (legacyMethods.includes(methodOrUrl)) {
    return apiFetch(urlOrConfig as string, {
      method: methodOrUrl.toUpperCase(),
      data,
    }) as Promise<T>;
  }

  return apiFetch(methodOrUrl, {
    method: ((urlOrConfig as ApiOptions)?.method ?? "GET") as ApiOptions["method"],
    ...(urlOrConfig as ApiOptions),
  }) as Promise<T>;
}

const api = {
  get: <T = unknown>(path: string, options: ApiOptions = {}) => apiFetch(path, { ...options, method: "GET" }) as Promise<T>,
  post: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) => apiFetch(path, { ...options, method: "POST", data }) as Promise<T>,
  put: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) => apiFetch(path, { ...options, method: "PUT", data }) as Promise<T>,
  patch: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) => apiFetch(path, { ...options, method: "PATCH", data }) as Promise<T>,
  delete: <T = unknown>(path: string, options: ApiOptions = {}) => apiFetch(path, { ...options, method: "DELETE" }) as Promise<T>,
};

export const API_BASE = API_BASE_URL;
export default api;
