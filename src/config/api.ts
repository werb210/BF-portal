export const API_BASE = "https://api.staff.boreal.financial";

export function apiUrl(path: string) {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return `${API_BASE}${path}`;
}
