function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function hasApiSuffix(value: string): boolean {
  return /\/api$/i.test(value);
}

export function normalizeApiBaseUrl(rawBase: string): string {
  const normalized = stripTrailingSlash((rawBase || "").trim());
  if (!normalized) {
    return "/api";
  }

  if (normalized === "/api" || hasApiSuffix(normalized)) {
    return normalized;
  }

  return `${normalized}/api`;
}

export function normalizeApiPath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const withoutApiPrefix = withLeadingSlash === "/api"
    ? "/"
    : withLeadingSlash.replace(/^\/api(?=\/|$)/, "");

  return withoutApiPrefix === "/" ? "/" : withoutApiPrefix;
}

export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL || "https://server.boreal.financial/api"
);

export const API_TIMEOUT = 30000;

export const API_BASE = API_BASE_URL;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${normalizeApiPath(path)}`;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
