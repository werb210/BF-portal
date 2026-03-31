import { API_BASE_URL } from "@/config/api";

const REQUEST_TIMEOUT_MS = 10_000;

type ApiRequestOptions = RequestInit & {
  raw?: boolean;
  skipAuth?: boolean;
};

function normalizeEndpoint(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (endpoint.startsWith("/_")) return endpoint;
  if (endpoint.startsWith("/api")) return endpoint;
  if (endpoint.startsWith("/")) return `/api${endpoint}`;
  return `/api/${endpoint}`;
}

function resolveToken() {
  if (typeof process !== "undefined" && process.env?.API_TOKEN) return process.env.API_TOKEN;
  if (typeof window !== "undefined") return localStorage.getItem("auth_token") || localStorage.getItem("bf_token");
  return null;
}

export async function apiRequest(endpoint: string, options: ApiRequestOptions = {}) {
  const token = resolveToken();
  if (!options.skipAuth && !token) throw new Error("NO API TOKEN — AUTH FLOW BROKEN");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const existingHeaders = options.headers ?? {};
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...existingHeaders,
  };

  const requestUrl = `${API_BASE_URL}${normalizeEndpoint(endpoint)}`;

  try {
    const res = await fetch(requestUrl, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });

    if (options.raw) return res;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[API ERROR] ${res.status} ${text}`);
    }

    if (res.status === 204) return null;

    const contentType = res.headers.get("content-type") || "";
    return contentType.includes("application/json") ? res.json() : res.text();
  } catch (error) {
    console.error("[AGENT ERROR]", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { normalizeEndpoint };
export type { ApiRequestOptions };
