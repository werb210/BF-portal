import { request as axiosRequest } from "axios";
import { assertApiResponse } from "@/lib/assertApiResponse";
import { requireAuth } from "@/utils/requireAuth";

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

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const token = requireAuth();
  const payload = options.body ?? options.data;

  try {
    const response = await axiosRequest({
      ...options,
      baseURL: "https://server.boreal.financial",
      method,
      url: ensureApiPath(path),
      data: payload,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

    return assertApiResponse<T>(response.data);
  } catch (error: any) {
    console.error("PORTAL API ERROR:", error?.response || error?.message);
    const message = error?.response?.data?.error || error?.message || "Unknown API error";
    throw new Error(message);
  }
}

export { requireAuth };
