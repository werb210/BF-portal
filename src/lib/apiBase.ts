import { API_BASE_URL, apiUrl } from "@/config/api";

export { API_BASE_URL };

export function withApiBase(path: string): string {
  if (path.startsWith("http")) return path;
  return apiUrl(path);
}
