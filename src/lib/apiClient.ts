const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error("Missing VITE_API_URL");
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("API_ERROR", {
      path,
      status: res.status,
      body: text,
    });

    throw new Error(`API request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function safeApiRequest<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (err) {
    console.error("API_FAILURE", path, err);
    throw err;
  }
}

export const apiGet = <T = unknown>(path: string) => apiRequest<T>(path, { method: "GET" });
export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const apiPut = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const apiPatch = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const apiDelete = <T = unknown>(path: string) => apiRequest<T>(path, { method: "DELETE" });

export const apiPublicGet = apiGet;
export const apiPublicPost = apiPost;
