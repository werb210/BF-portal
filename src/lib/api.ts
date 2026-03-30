const API_BASE =
  import.meta.env.VITE_API_URL || "https://server.boreal.financial";

let authToken: string | null = null;

export function setToken(token: string) {
  authToken = token;
}

export function clearToken() {
  authToken = null;
}

export function getToken() {
  return authToken;
}

type ApiOptions = RequestInit & { raw?: boolean };

function toUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/api/")) return `${API_BASE}${path}`;
  if (path.startsWith("/")) return `${API_BASE}/api${path}`;
  return `${API_BASE}/api/${path}`;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const res = await fetch(toUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (options.raw) return res;

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  if (!res.ok) {
    const body = isJson ? await res.json().catch(() => null) : await res.text();
    throw new Error(
      `API ${res.status}: ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`
    );
  }

  return isJson ? res.json() : res.text();
}

export async function apiRequest<T = unknown>(url: string, config: (ApiOptions & { data?: unknown }) = {}): Promise<T>;
export async function apiRequest<T = unknown>(method: "get" | "post" | "put" | "patch" | "delete", url: string, data?: unknown): Promise<T>;
export async function apiRequest<T = unknown>(
  methodOrUrl: string,
  urlOrConfig: string | (ApiOptions & { data?: unknown }) = {},
  data?: unknown,
): Promise<T> {
  const legacyMethods = ["get", "post", "put", "patch", "delete"];
  if (legacyMethods.includes(methodOrUrl)) {
    return apiFetch(urlOrConfig as string, {
      method: methodOrUrl.toUpperCase(),
      body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data),
    }) as Promise<T>;
  }

  const config = (urlOrConfig ?? {}) as ApiOptions & { data?: unknown };
  return apiFetch(methodOrUrl, {
    ...config,
    method: config.method ?? "GET",
    body: config.data === undefined ? config.body : config.data instanceof FormData ? config.data : JSON.stringify(config.data),
  }) as Promise<T>;
}

const api = {
  get: <T = unknown>(path: string, options: ApiOptions = {}) => apiFetch(path, { ...options, method: "GET" }) as Promise<T>,
  post: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiFetch(path, { ...options, method: "POST", body: data instanceof FormData ? data : JSON.stringify(data) }) as Promise<T>,
  put: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiFetch(path, { ...options, method: "PUT", body: data instanceof FormData ? data : JSON.stringify(data) }) as Promise<T>,
  patch: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiFetch(path, { ...options, method: "PATCH", body: data instanceof FormData ? data : JSON.stringify(data) }) as Promise<T>,
  delete: <T = unknown>(path: string, options: ApiOptions = {}) => apiFetch(path, { ...options, method: "DELETE" }) as Promise<T>,
};

export async function safeApiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T | null> {
  try {
    return (await apiFetch(path, options)) as T;
  } catch {
    return null;
  }
}

export { API_BASE };
export default api;
