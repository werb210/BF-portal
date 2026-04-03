import { getApiBase } from "./apiBase";
import { getSilo } from "./silo";
import { assertSilo } from "./siloGuard";

const withApiPrefix = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    const url = new URL(path);
    const pathname = url.pathname.startsWith("/api/v1") ? url.pathname : `/api/v1${url.pathname.startsWith("/") ? "" : "/"}${url.pathname}`;
    return `${pathname}${url.search}`;
  }

  if (path.startsWith("/api/v1")) return path;
  return `/api/v1${path.startsWith("/") ? "" : "/"}${path}`;
};

export async function apiCall(path: string, options: RequestInit = {}) {
  const base = getApiBase();
  const prefixedPath = withApiPrefix(path);

  const res = await fetch(`${base}${prefixedPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-silo": getSilo(),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((json as { error?: string })?.error || "API error");
  }

  if (json && typeof json === "object" && "data" in json) {
    const data = (json as { data?: unknown }).data;
    assertSilo(data);
    return data;
  }

  assertSilo(json);
  return json;
}
