import { buildApiUrl } from "./apiClient";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(buildApiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const type = res.headers.get("content-type");

  if (type && type.includes("application/json")) {
    return res.json();
  }

  return res.text();
}
