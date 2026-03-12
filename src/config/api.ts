export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://server.boreal.financial";

export const API_TIMEOUT = 30000;

export const API_BASE = API_BASE_URL;

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
