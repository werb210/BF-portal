export async function apiFetch(
  url: string,
  options: RequestInit = {}
) {
  // normalize URL (prevent //api)
  url = url.replace(/([^:]\/)\/+/g, "$1");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // ensure request id always present
  if (!headers["x-request-id"]) {
    headers["x-request-id"] = `rid-${Math.random().toString(36).slice(2, 10)}`;
  }

  // ensure auth header always present
  if (!headers["Authorization"]) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_token") ||
          localStorage.getItem(import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token")
        : null;

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
