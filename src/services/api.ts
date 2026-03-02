import { getApiBaseUrl } from "@/config/api";
import { getRequestId } from "@/api/requestId";

function normalizePath(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  if (path === "/health") return path;
  const trimmed = path.startsWith("/api/") ? path.replace(/^\/api/, "") : path;
  return `/api${trimmed}`;
}

function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = normalizePath(path);
  return `${baseUrl}${normalizedPath}`;
}

const navigateTo = (path: string) => {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  const isTestEnv = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
  if (isTestEnv) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }
  try {
    window.location.assign(path);
  } catch {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const requestId = getRequestId();
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      ...(options.headers ?? {})
    },
    ...options
  });

  if (res.status === 401) {
    navigateTo("/login");
    throw new Error("unauthorized");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const apiError =
      data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "api_error";
    throw new Error(apiError);
  }

  return data as T;
}

export const redirectToLogin = () => {
  navigateTo("/login");
};

export const redirectToDashboard = () => {
  navigateTo("/dashboard");
};

const getApiBaseUrlValue = () => getApiBaseUrl();

export { buildApiUrl, getApiBaseUrlValue as API_BASE };
