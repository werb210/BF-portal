const DEFAULT_API_BASE_URL = "https://api.staff.boreal.financial";

const rawApiBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE_URL;

function normalizeApiBaseUrl(base: string): string {
  return base.replace(/\/$/, "").replace(/\/api$/, "");
}

export const API_BASE = rawApiBase;
export const API_BASE_URL = normalizeApiBaseUrl(rawApiBase);

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
