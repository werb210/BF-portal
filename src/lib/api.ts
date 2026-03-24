export async function apiRequest(
  path: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await window["fetch"](`/api/${normalizedPath}`, {
    ...options,
    headers,
    credentials: "include",
  });

  let json: any = null;

  try {
    json = await res.json();
  } catch (_error) {
    console.error("API JSON parse failed:", path);
  }

  if (!res.ok) {
    console.error("API ERROR:", {
      path,
      status: res.status,
      response: json,
    });
    throw new Error(`API ${res.status}`);
  }

  const result = json?.data ?? json;

  if (result === undefined || result === null) {
    console.warn("EMPTY API RESPONSE:", path);
  }

  return result;
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
