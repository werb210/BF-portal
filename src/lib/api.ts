import { API_BASE_URL } from "@/config/api";
import { apiFetch } from "@/lib/apiFetch";

export const API_BASE = API_BASE_URL;

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function buildUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedOptions =
    options.body !== undefined && typeof options.body !== "string" && !(options.body instanceof FormData)
      ? { ...options, body: JSON.stringify(options.body) }
      : options;

  try {
    return await apiFetch<T>(path, normalizedOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "API request failed";
    throw new ApiError(message);
  }
}

export async function safeApiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}

export const api = {
  async get<T = any>(path: string, options: RequestInit = {}) {
    const data = await apiFetch<T>(path, { ...options, method: "GET" });
    return { data };
  },
  async post<T = any>(path: string, body?: unknown, options: RequestInit = {}) {
    const data = await apiFetch<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  async patch<T = any>(path: string, body?: unknown, options: RequestInit = {}) {
    const data = await apiFetch<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  async delete<T = any>(path: string, options: RequestInit = {}) {
    const data = await apiFetch<T>(path, { ...options, method: "DELETE" });
    return { data };
  },
};

export default api;
