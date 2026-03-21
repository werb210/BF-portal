import { buildUrl } from "@/lib/api";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  return fetch(buildUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
}
