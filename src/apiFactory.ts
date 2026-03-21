import { reportError } from "@/utils/reportError";
import { showToast } from "@/utils/toastEvents";
import { generateRequestId } from "@/api/requestId";
import { clearToken } from "@/auth/tokenStorage";
import { apiFetch } from "@/api/client";

export type ApiSilo = "bf" | "bi" | "slf" | "admin";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiResponse<T> = { data: T; status: number };

async function request<T>(method: Method, url: string, data: unknown, silo: ApiSilo, token: string): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "x-silo": silo,
  };

  const requestId = generateRequestId();
  if (requestId && requestId.trim().length > 0) {
    headers["x-request-id"] = requestId;
  }

  if (token && token.trim().length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiFetch(url, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (response.status === 403) {
    showToast("Access denied", "error");
  }

  if (response.status >= 400) {
    const error = new Error(`Request failed with status ${response.status}`);
    reportError(error);
    throw error;
  }

  const json = (await response.json()) as T;
  return { data: json, status: response.status };
}

export function createApi(silo: ApiSilo, token: string) {
  return {
    get: <T = unknown>(url: string) => request<T>("GET", url, undefined, silo, token),
    post: <T = unknown>(url: string, data?: unknown) => request<T>("POST", url, data, silo, token),
    put: <T = unknown>(url: string, data?: unknown) => request<T>("PUT", url, data, silo, token),
    patch: <T = unknown>(url: string, data?: unknown) => request<T>("PATCH", url, data, silo, token),
    delete: <T = unknown>(url: string) => request<T>("DELETE", url, undefined, silo, token),
  };
}
