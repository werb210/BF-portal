import { API_BASE_URL } from "@/config/api";

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  if (path.startsWith("/api")) {
    throw new Error("INVALID_API_PATH: Do not use /api prefix");
  }

  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API_ERROR ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}
