export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }

  return (json?.data ?? json) as T;
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
