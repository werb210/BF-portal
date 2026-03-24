export class ApiError extends Error {
  status?: number;
}

export const API_BASE = import.meta.env.VITE_API_URL || "";

if (!API_BASE) {
  throw new Error("Missing VITE_API_URL");
}

export function buildUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid API path: ${path}`);
  }
  return `${API_BASE}${path}`;
}

function resolveApiPath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid API path: ${path}`);
  }
  return path.startsWith("/api") ? path.slice(4) || "/" : path;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const normalizedPath = resolveApiPath(path);
  const requestUrl = buildUrl(`/api${normalizedPath}`);
  const res = await fetch(requestUrl, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined;
  }

  const json = await res.json().catch(() => null);

  // normalize inconsistent server responses
  return (json as { data?: unknown } | null)?.data ?? json;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  return (await apiRequest(endpoint, options)) as T;
}

export async function safeApiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    return await apiFetch<T>(endpoint, options);
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

export const api = {
  async get<T = any>(path: string, options: RequestInit = {}): Promise<{ data: T }> {
    const data = await apiFetch<T>(path, { ...options, method: "GET" });
    return { data };
  },
  async post<T = any>(path: string, body?: unknown, options: RequestInit = {}): Promise<{ data: T }> {
    const isFormData = body instanceof FormData;
    const data = await apiFetch<T>(path, {
      ...options,
      method: "POST",
      body: isFormData ? (body as FormData) : body == null ? undefined : JSON.stringify(body),
    });
    return { data };
  },
  async patch<T = any>(path: string, body?: unknown, options: RequestInit = {}): Promise<{ data: T }> {
    const isFormData = body instanceof FormData;
    const data = await apiFetch<T>(path, {
      ...options,
      method: "PATCH",
      body: isFormData ? (body as FormData) : body == null ? undefined : JSON.stringify(body),
    });
    return { data };
  },
  async delete<T = any>(path: string, options: RequestInit = {}): Promise<{ data: T }> {
    const data = await apiFetch<T>(path, { ...options, method: "DELETE" });
    return { data };
  },
};

export default api;
