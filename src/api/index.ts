import { getAuthToken } from "@/lib/authToken";
import { ApiError } from "@/api/http";
import { setApiStatus } from "@/state/apiStatus";
import { API_ERROR } from "@/lib/errors";
// BF_SILO_API_ROUTING_v43 — Block 43 — use resolveApiBase so /api/v1/* hits BI-Server
import { resolveApiBase, getActiveSilo, __apiBaseUrls } from "@/config/api";
import { shouldLogoutOn401 } from "@/lib/apiAuth";

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
};

type ApiFn = {
  <T = any>(path: string, options?: RequestOptions): Promise<T>;
  get<T = any>(path: string, options?: RequestOptions): Promise<T>;
  getList<T = any>(path: string, options?: RequestOptions): Promise<T[]>;
  post<T = any>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T = any>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T = any>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T = any>(path: string, options?: RequestOptions): Promise<T>;
};

const PUBLIC_AUTH_PATHS = [
  "/api/auth/otp/start",
  "/api/auth/otp/verify",
];

function requiresAuth(path: string) {
  return !PUBLIC_AUTH_PATHS.includes(path);
}

function withQuery(path: string, params?: RequestOptions["params"]) {
  if (!params) return path;
  // BF_SILO_API_ROUTING_v43 — Block 43 — base depends on path
  const url = new URL(path, resolveApiBase(path));
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return `${url.pathname}${url.search}`;
}


function buildUrl(path: string, explicitSilo?: "BF" | "BI" | "SLF"): string {
  // BF_PORTAL_BLOCK_1_19_BI_SILO_HARD_ISOLATION — when an explicit silo is
  // passed, use the matching server URL directly (BI -> BI-Server,
  // BF/SLF -> BF-Server). Otherwise fall back to the active silo from
  // sessionStorage via resolveApiBase().
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = explicitSilo
    ? __apiBaseUrls[explicitSilo === "BI" ? "bi" : "bf"]
    : resolveApiBase(normalized);
  return `${base}${normalized}`;
}


function getSiloHeaders(): Record<string, string> {
  const silo = getActiveSilo();
  return silo ? { "X-Silo": silo } : {};
}

function parsePayload<T>(json: any): T {
  if (json && typeof json === "object") {
    if ("data" in json) {
      return json.data as T;
    }
    if (json.status === "error") {
      if (json.error === "DB_NOT_READY") {
        setApiStatus("degraded");
        return { degraded: true } as T;
      }
      throw new Error(API_ERROR);
    }
  }
  return json as T;
}

export async function rawApiFetch(path: string, options: RequestOptions = {}) {
  const token = getAuthToken();

  if (!token && requiresAuth(path)) {
    throw new Error(API_ERROR);
  }

  const headers: Record<string, string> = {
    ...getSiloHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestPath = withQuery(path, options.params);

  const body =
    options.body && !(options.body instanceof FormData)
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : (options.body as BodyInit | null | undefined);

  return fetch(buildUrl(requestPath), {
    ...options,
    headers,
    credentials: "include",
    body,
  });
}

export async function apiFetch<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await rawApiFetch(path, options);
  if (!res.ok) {
    const url = res.url || buildUrl(withQuery(path, options.params));
    if (res.status === 401 && !shouldLogoutOn401(url)) {
      setApiStatus("degraded");
      console.warn("[api] non-session 401 from", url, "— not logging out");
    }

    let message = API_ERROR;
    let code: string | undefined;
    let details: unknown;
    try {
      const payload = await res.json();
      if (payload && typeof payload === "object") {
        const maybeMessage = (payload as { message?: unknown; error?: unknown }).message
          ?? (payload as { message?: unknown; error?: unknown }).error;
        if (typeof maybeMessage === "string" && maybeMessage.trim()) {
          message = maybeMessage;
        }
        if (typeof (payload as { code?: unknown }).code === "string") {
          code = (payload as { code?: string }).code;
        }
        details = payload;
      }
    } catch {
      // Ignore non-JSON error responses and preserve fallback message.
    }
    throw new ApiError({
      status: res.status,
      message,
      code,
      details,
      requestId: res.headers.get("x-request-id") ?? undefined,
    });
  }

  // BF_PORTAL_V55_FIX_FOLLOWUP_v55a — handle empty bodies (204 / 200 with
  // no content) without throwing, while still surfacing real parse errors.
  // Order:
  //   1) If status is 204, return undefined immediately (no body to read).
  //   2) Try res.json() first — this is the common path and works for all
  //      Response-shaped objects, including the ones used in tests that
  //      mock { ok, json: async () => ... }.
  //   3) If res.json() throws, the body is either empty or non-JSON. Use
  //      res.text() (when available) to distinguish: empty → undefined;
  //      non-empty → re-throw the original parse error.
  if (res.status === 204) {
    return undefined as T;
  }
  const textProbe = typeof res.clone === "function" ? res.clone() : null;
  let json: unknown;
  try {
    json = await res.json();
  } catch (parseError) {
    // .text() may not exist on test mocks. If it doesn't, treat the empty
    // body as the cause and return undefined.
    if (!textProbe || typeof textProbe.text !== "function") {
      return undefined as T;
    }
    let text: string;
    try {
      text = await textProbe.text();
    } catch {
      return undefined as T;
    }
    if (!text || !text.trim()) {
      return undefined as T;
    }
    // Non-empty unparseable body — surface the original error.
    throw parseError;
  }
  return parsePayload<T>(json);
}

export async function apiFetchWithRetry<T = any>(path: string, options: RequestOptions = {}, retries = 1) {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (retries > 0) {
      return apiFetchWithRetry<T>(path, options, retries - 1);
    }
    throw new Error(API_ERROR);
  }
}

const apiImpl = (async <T = any>(path: string, options: RequestOptions = {}) =>
  apiFetch<T>(path, options)) as ApiFn;

apiImpl.get = <T = any>(path: string, options: RequestOptions = {}) =>
  apiFetch<T>(path, { ...options, method: "GET" });
apiImpl.getList = <T = any>(path: string, options: RequestOptions = {}) =>
  apiFetch<T[]>(path, { ...options, method: "GET" });
apiImpl.post = <T = any>(path: string, body?: unknown, options: RequestOptions = {}) =>
  apiFetch<T>(path, { ...options, method: "POST", body });
apiImpl.patch = <T = any>(path: string, body?: unknown, options: RequestOptions = {}) =>
  apiFetch<T>(path, { ...options, method: "PATCH", body });
apiImpl.put = <T = any>(path: string, body?: unknown, options: RequestOptions = {}) =>
  apiFetch<T>(path, { ...options, method: "PUT", body });
apiImpl.delete = <T = any>(path: string, options: RequestOptions = {}) =>
  apiFetch<T>(path, { ...options, method: "DELETE" });

export const api = apiImpl;

// BF_PORTAL_BLOCK_1_19_BI_SILO_HARD_ISOLATION — explicit-silo helper for
// pages that fan out across silos (GlobalAdmin, AdminActivity, AuditLogs,
// CommissionDetail). Most callers should use the default `api` which
// follows the active silo. Use this only when you genuinely need to call a
// specific silo's server regardless of which silo the user is currently
// viewing.
export function apiForSilo(silo: "BF" | "BI" | "SLF"): ApiFn {
  const wrap = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const requestPath = withQuery(path, options.params);
    const fullUrl = buildUrl(requestPath, silo);
    const token = getAuthToken();

    if (!token && requiresAuth(path)) {
      throw new Error(API_ERROR);
    }

    const headers: Record<string, string> = {
      "X-Silo": silo,
      ...(options.headers as Record<string, string> | undefined),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const body =
      options.body && !(options.body instanceof FormData)
        ? typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
        : (options.body as BodyInit | null | undefined);

    const res = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: "include",
      body,
    });

    if (!res.ok) {
      const url = res.url || fullUrl;
      if (res.status === 401 && !shouldLogoutOn401(url)) {
        setApiStatus("degraded");
      }

      let message = API_ERROR;
      let code: string | undefined;
      let details: unknown;
      try {
        const payload = await res.json();
        if (payload && typeof payload === "object") {
          const maybeMessage = (payload as { message?: unknown; error?: unknown }).message
            ?? (payload as { message?: unknown; error?: unknown }).error;
          if (typeof maybeMessage === "string" && maybeMessage.trim()) {
            message = maybeMessage;
          }
          if (typeof (payload as { code?: unknown }).code === "string") {
            code = (payload as { code?: string }).code;
          }
          details = payload;
        }
      } catch {
        // ignore
      }
      throw new ApiError({
        status: res.status,
        message,
        code,
        details,
        requestId: res.headers.get("x-request-id") ?? undefined,
      });
    }

    if (res.status === 204) return undefined as T;
    const textProbe = typeof res.clone === "function" ? res.clone() : null;
    let json: unknown;
    try {
      json = await res.json();
    } catch (parseError) {
      if (!textProbe || typeof textProbe.text !== "function") return undefined as T;
      const text = await textProbe.text().catch(() => "");
      if (!text || !text.trim()) return undefined as T;
      throw parseError;
    }
    return parsePayload<T>(json);
  };

  const fn = ((path: string, options?: RequestOptions) => wrap(path, options)) as ApiFn;
  fn.get = (path, options = {}) => wrap(path, { ...options, method: "GET" });
  fn.getList = <T = any>(path: string, options: RequestOptions = {}) =>
    wrap<T[]>(path, { ...options, method: "GET" });
  fn.post = (path, body, options = {}) => wrap(path, { ...options, method: "POST", body });
  fn.patch = (path, body, options = {}) => wrap(path, { ...options, method: "PATCH", body });
  fn.put = (path, body, options = {}) => wrap(path, { ...options, method: "PUT", body });
  fn.delete = (path, options = {}) => wrap(path, { ...options, method: "DELETE" });
  return fn;
}
export const http = apiImpl;
export const apiPost = apiImpl.post;

export type LenderAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type LenderApiClientConfig = {
  tokenProvider?: () => LenderAuthTokens | null;
  onTokensUpdated?: (nextTokens: LenderAuthTokens | null) => void;
  onUnauthorized?: () => void;
};

let lenderConfig: LenderApiClientConfig = {};

export function configureLenderApiClient(config: LenderApiClientConfig) {
  lenderConfig = config;
}

function lenderHeaders() {
  const nextTokens = lenderConfig.tokenProvider?.();
  return nextTokens?.accessToken ? { Authorization: `Bearer ${nextTokens.accessToken}` } : undefined;
}

export const lenderApiClient = {
  get: apiImpl.get,
  getList: apiImpl.getList,
  post: <T = any>(path: string, body?: unknown) =>
    apiImpl.post<T>(path, body, {
      headers: lenderHeaders(),
    }),
  patch: <T = any>(path: string, body?: unknown) =>
    apiImpl.patch<T>(path, body, {
      headers: lenderHeaders(),
    }),
  delete: apiImpl.delete,
};

export { ApiError };

export default apiImpl;
