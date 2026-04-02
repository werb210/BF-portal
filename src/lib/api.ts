import { ENV } from "../config/env";

export async function apiRequest(path: string, options?: RequestInit) {
  const res = await fetch(`${ENV.API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `API error (${res.status})`);
  }

  return data;
}
