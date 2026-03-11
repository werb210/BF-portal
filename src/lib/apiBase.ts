import { API_BASE, apiUrl } from "@/config/api";

export const API_BASE_URL = API_BASE;

export function withApiBase(path: string): string {
  if (path.startsWith("http")) return path;
  return apiUrl(path);
}
