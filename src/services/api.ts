import { getRequestId } from "@/api/requestId";
import { getApiBaseUrl, normalizeApiPath } from "@/config/api";
import { apiClient } from "@/lib/apiClient";

function normalizePath(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  if (path === "/health") return path;
  return normalizeApiPath(path);
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
  const method = (options.method || "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  try {
    const res = await apiClient.request<T>({
      url,
      method,
      data: options.body,
      headers: {
        "X-Request-Id": requestId,
        ...(options.headers as Record<string, string> | undefined)
      }
    });

    return res.data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;

    if (status === 401) {
      navigateTo("/login");
      throw new Error("unauthorized");
    }

    const apiError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
    throw new Error(apiError || "api_error");
  }
}

export const redirectToLogin = () => {
  navigateTo("/login");
};

export const redirectToDashboard = () => {
  navigateTo("/dashboard");
};

const getApiBaseUrlValue = () => getApiBaseUrl();

export { buildApiUrl, getApiBaseUrlValue as API_BASE };
