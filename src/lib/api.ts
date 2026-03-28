import axios from "axios";
import type { ApiResponse } from "@/types/api";
import { assertApiResponse } from "@/lib/assertApiResponse";
import { requireAuth } from "@/utils/requireAuth";

const API_BASE_URL = "https://server.boreal.financial";

const ensureApiPath = (url?: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return url;
  if (url === "/api") return url;
  if (url.startsWith("/")) return `/api${url}`;
  return `/api/${url}`;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  data?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  [key: string]: unknown;
};

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = (options.method ?? "GET").toUpperCase();
  const token = requireAuth();
  const payload = options.body ?? options.data;

  try {
    const response = await axios.request<ApiResponse<T>>({
      ...options,
      method,
      url: ensureApiPath(path),
      baseURL: API_BASE_URL,
      data: payload,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

    assertApiResponse<T>(response.data);
    return response.data;
  } catch (error: any) {
    console.error("PORTAL API ERROR:", error?.response || error?.message);
    const message = error?.response?.data?.error || error?.message || "Unknown API error";
    throw new Error(message);
  }
}

export { requireAuth };
