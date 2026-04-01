import { getToken } from "@/auth/token";

export type ApiClientOptions = RequestInit & {
  skipAuth?: boolean;
};

const getBase = (): string => {
  const base = (window as any).__API_BASE__ || import.meta.env.VITE_API_URL;
  if (!base) {
    throw new Error("API_BASE_NOT_DEFINED");
  }
  return base;
};

const normalize = (base: string, path: string): string =>
  `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

const toHeaders = (options: ApiClientOptions = {}): HeadersInit => {
  const headers = new Headers(options.headers || {});

  if (!options.skipAuth) {
    const token = getToken();
    if (!token) {
      throw new Error("MISSING_AUTH");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
};

export async function apiClient(path: string, options: ApiClientOptions = {}): Promise<unknown> {
  const { skipAuth: _skipAuth, ...requestOptions } = options;
  const res = await fetch(normalize(getBase(), path), {
    ...requestOptions,
    headers: toHeaders(options),
  });

  if (!res.ok) {
    throw new Error(`HTTP_ERROR_${res.status}`);
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!json || typeof json !== "object") {
    throw new Error("INVALID_API_SHAPE");
  }

  if (!Object.prototype.hasOwnProperty.call(json, "status")) {
    throw new Error("MISSING_STATUS_FIELD");
  }

  if (json.status === "error") {
    if (!json.error || !json.error.message) {
      throw new Error("MALFORMED_ERROR");
    }
    throw new Error(json.error.message);
  }

  if (json.status !== "ok") {
    throw new Error("UNKNOWN_STATUS");
  }

  if (!Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("MISSING_DATA_FIELD");
  }

  return json.data;
}

const withBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
};

export async function apiRequest<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<T> {
  return (await apiClient(path, options)) as T;
}

export const safeApiRequest = async <T = unknown>(path: string, options?: ApiClientOptions): Promise<T> =>
  apiRequest<T>(path, options);

export const apiGet = <T = unknown>(path: string) => apiRequest<T>(path, { method: "GET" });
export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "POST", body: withBody(body) });
export const apiPut = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "PUT", body: withBody(body) });
export const apiPatch = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "PATCH", body: withBody(body) });
export const apiDelete = <T = unknown>(path: string) => apiRequest<T>(path, { method: "DELETE" });

export const apiPublicGet = apiGet;
export const apiPublicPost = apiPost;
