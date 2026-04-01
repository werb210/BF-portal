export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const BASE_URL = import.meta.env.VITE_API_URL || process.env.REACT_APP_API_URL || "";

function buildUrl(path: string) {
  if (!path.startsWith("/api/")) {
    throw new Error(`Invalid API path (must start with /api/): ${path}`);
  }

  return `${BASE_URL}${path}`;
}

function getAuthHeader() {
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");

  if (!token) {
    throw new Error("NOT_AUTHENTICATED");
  }

  return { Authorization: `Bearer ${token}` };
}

async function parseJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiResponse<T>;

  if (json.success === false) {
    throw new Error(json.error);
  }

  return json.data;
}

export async function apiRequest<T>(method: HttpMethod, path: string, body?: unknown, isPublic = false): Promise<T> {
  const headers: HeadersInit = isPublic ? {} : { ...getAuthHeader() };
  const payload = body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body);

  if (!(payload instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers,
      body: payload,
    });

    return parseJson<T>(response);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_AUTHENTICATED") {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    throw err;
  }
}

export const apiGet = <T>(path: string) => apiRequest<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown) => apiRequest<T>("POST", path, body);
export const apiPut = <T>(path: string, body?: unknown) => apiRequest<T>("PUT", path, body);
export const apiPatch = <T>(path: string, body?: unknown) => apiRequest<T>("PATCH", path, body);
export const apiDelete = <T>(path: string) => apiRequest<T>("DELETE", path);

export const apiPublicGet = <T>(path: string) => apiRequest<T>("GET", path, undefined, true);
export const apiPublicPost = <T>(path: string, body?: unknown) => apiRequest<T>("POST", path, body, true);
