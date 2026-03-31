import { API_BASE_URL } from "@/config/api";

const REQUEST_TIMEOUT_MS = 10_000;

type ApiRequestOptions = RequestInit & {
  raw?: boolean;
};

function resolveRequestUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/api/")) {
    throw new Error(`INVALID API PATH: ${url}`);
  }
  return `${API_BASE_URL}${url}`;
}

function getTokenOrFail() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("TOKEN MISSING — REQUEST BLOCKED");
  }

  return token;
}

function buildHeaders(existing?: HeadersInit) {
  const token = getTokenOrFail();
  const normalized: Record<string, unknown> = {};

  if (existing instanceof Headers) {
    existing.forEach((value, key) => {
      normalized[key] = value;
    });
  } else if (Array.isArray(existing)) {
    for (const [key, value] of existing) {
      normalized[key] = value;
    }
  } else if (existing) {
    Object.assign(normalized, existing);
  }

  return {
    ...normalized,
    Authorization: `Bearer ${token}`,
  };
}

export async function coreApiRequest(url: string, options: ApiRequestOptions = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const requestUrl = resolveRequestUrl(url);

  try {
    const res = await fetch(requestUrl, {
      ...options,
      headers: buildHeaders(options.headers),
      signal: options.signal ?? controller.signal,
    });

    console.log("[TOKEN]", localStorage.getItem("token")?.slice(0, 12));
    console.log("[REQ]", options.method || "GET", requestUrl);

    if (res.status === 401) {
      console.error("[401] AUTH FAILURE");
      throw new Error("UNAUTHORIZED");
    }

    if (options.raw) return res;

    if (!res.ok) {
      const text = await res.text();
      console.error("[API ERROR]", res.status, text);
      throw new Error(`API FAILED: ${res.status}`);
    }

    if (res.status === 204) {
      throw new Error("EMPTY RESPONSE");
    }

    const data = await res.json();
    if (!data) {
      throw new Error("EMPTY RESPONSE");
    }

    return data;
  } catch (err) {
    console.error("[NETWORK ERROR]", err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { buildHeaders, getTokenOrFail };
export const apiRequest = coreApiRequest;
export type { ApiRequestOptions };
