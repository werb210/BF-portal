export const API_BASE = "https://boreal-staff-server-e4hmaqbkb2g5hgfv.canadacentral-01.azurewebsites.net";

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function buildUrl(path: string): string {
  const runtimeBase =
    typeof window !== "undefined" ? ((window as any).__BF_API_BASE_URL__ as string | undefined) : undefined;
  return `${runtimeBase ?? API_BASE}${path}`;
}

export async function apiFetch(path: string, options: any = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(buildUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(json?.error || "API request failed", res.status);
  }

  return json;
}

export async function apiRequest<T = any>(path: string, options: any = {}): Promise<T> {
  return (await apiFetch(path, options)) as T;
}

export async function safeApiFetch<T = any>(path: string, options: any = {}): Promise<T | null> {
  try {
    return (await apiFetch(path, options)) as T;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}

export const api = {
  async get<T = any>(path: string, options: any = {}) {
    const data = await apiFetch(path, { ...options, method: "GET" });
    return { data: data as T };
  },
  async post<T = any>(path: string, body?: unknown, options: any = {}) {
    const data = await apiFetch(path, { ...options, method: "POST", body });
    return { data: data as T };
  },
  async patch<T = any>(path: string, body?: unknown, options: any = {}) {
    const data = await apiFetch(path, { ...options, method: "PATCH", body });
    return { data: data as T };
  },
  async delete<T = any>(path: string, options: any = {}) {
    const data = await apiFetch(path, { ...options, method: "DELETE" });
    return { data: data as T };
  },
};

export default api;
