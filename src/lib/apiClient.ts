export type ApiRequestOptions = RequestInit & {
  raw?: boolean;
};

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getTokenOrFail(): string {
  const token = localStorage.getItem("token");

  if (!token || token.trim() === "") {
    console.error("[AUTH] Missing token at request time");
    throw new Error("NOT_AUTHENTICATED");
  }

  return token;
}

function normalizeHeaders(existing?: HeadersInit) {
  const normalized: Record<string, string> = {};

  if (existing instanceof Headers) {
    existing.forEach((value, key) => {
      normalized[key] = value;
    });
  } else if (Array.isArray(existing)) {
    for (const [key, value] of existing) {
      normalized[key] = String(value);
    }
  } else if (existing) {
    Object.entries(existing).forEach(([key, value]) => {
      if (value != null) normalized[key] = String(value);
    });
  }

  return normalized;
}

export async function apiRequest<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T>;
export async function apiRequest<T = unknown>(method: "get" | "post" | "put" | "patch" | "delete", path: string, data?: unknown): Promise<T>;
export async function apiRequest<T = unknown>(
  pathOrMethod: string,
  optionsOrPath: ApiRequestOptions | string = {},
  data?: unknown,
): Promise<T> {
  const isLegacyMethod = ["get", "post", "put", "patch", "delete"].includes(pathOrMethod.toLowerCase());
  const path = isLegacyMethod ? (optionsOrPath as string) : pathOrMethod;
  const options: ApiRequestOptions = isLegacyMethod
    ? {
        method: pathOrMethod.toUpperCase(),
        body: data instanceof FormData ? data : data === undefined ? undefined : JSON.stringify(data),
      }
    : (optionsOrPath as ApiRequestOptions);

  const token = getTokenOrFail();

  if (!path.startsWith("/api/")) {
    throw new Error(`[API] INVALID PATH: ${path}`);
  }

  const headers = normalizeHeaders(options.headers);

  const res = await fetch(path, {
    ...options,
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
      ...(options.body instanceof FormData ? {} : { "Content-Type": headers["Content-Type"] ?? "application/json" }),
    },
  });

  console.log("[REQ]", options.method || "GET", path);
  console.log("[STATUS]", res.status);

  if (res.status === 401) {
    console.error("[AUTH FAIL] TOKEN REJECTED");
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("UNAUTHORIZED");
  }

  if (options.raw) return res as T;

  if (!res.ok) {
    throw new ApiError(`[API ERROR] ${res.status}`, res.status);
  }

  if (res.status === 204) {
    return null as T;
  }

  return (await res.json()) as T;
}

export const apiFetch = apiRequest;

export type ApiOptions = ApiRequestOptions & { data?: unknown };

function normalizeBody(data: unknown, body: BodyInit | null | undefined) {
  if (data !== undefined) return data instanceof FormData ? data : JSON.stringify(data);
  return body;
}

const api = {
  get: <T = unknown>(path: string, options: ApiOptions = {}) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest<T>(path, { ...options, method: "POST", body: normalizeBody(data, options.body) }),
  put: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest<T>(path, { ...options, method: "PUT", body: normalizeBody(data, options.body) }),
  patch: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body: normalizeBody(data, options.body) }),
  delete: <T = unknown>(path: string, options: ApiOptions = {}) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export default api;
export { getTokenOrFail };
