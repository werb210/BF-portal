export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial/api";

export const API_TIMEOUT = 30000;

export const API_BASE = API_BASE_URL;

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  const baseEndsWithApi = API_BASE_URL.endsWith("/api");
  const pathStartsWithApi = path === "/api" || path.startsWith("/api/");

  if (baseEndsWithApi && pathStartsWithApi) {
    path = path.replace(/^\/api/, "") || "/";
  }

  return `${API_BASE_URL}${path}`;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
