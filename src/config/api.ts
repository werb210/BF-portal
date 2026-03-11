export const API_BASE_URL = "https://api.staff.boreal.financial";

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return `${API_BASE_URL}${path}`;
}

// Backward-compatible exports for existing imports.
export const API_BASE = API_BASE_URL;
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
