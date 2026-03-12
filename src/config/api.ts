const RAW_API_BASE_URL = "https://api.staff.boreal.financial/api";

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  const baseEndsWithApi = API_BASE_URL.endsWith("/api");
  const pathStartsWithApi = path === "/api" || path.startsWith("/api/");
  const normalizedPath = baseEndsWithApi && pathStartsWithApi ? path.replace(/^\/api/, "") || "/" : path;

  return `${API_BASE_URL}${normalizedPath}`;
}

// Backward-compatible exports for existing imports.
export const API_BASE = API_BASE_URL;
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
