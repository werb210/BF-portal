import { API_BASE, buildUrl } from "@/config/api";

export { API_BASE as API_BASE_URL };

export function withApiBase(path: string): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return buildUrl(normalized.replace(/^\/api(?=\/|$)/, ""));
}
