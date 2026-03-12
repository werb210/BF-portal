const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = (API_BASE || "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

export { API_BASE };
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
