const DEFAULT_API_BASE_URL = "https://boreal-staff-server-e4hmaqbkb2g5hgfv.canadacentral-01.azurewebsites.net";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);

const isAbsoluteUrl = (path: string) => /^https?:\/\//i.test(path);

export const normalizeApiPath = (path: string) => {
  if (!path || isAbsoluteUrl(path) || !path.startsWith("/")) return path;
  if (path.startsWith("/api/")) return path;
  return `/api${path}`;
};

export const withApiBase = (path: string) => `${API_BASE_URL}${normalizeApiPath(path)}`;

