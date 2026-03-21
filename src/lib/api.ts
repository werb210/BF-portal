const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

if (!API_BASE) {
  console.error("Missing VITE_API_BASE_URL or VITE_API_URL");
}

export function buildUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(buildUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}
