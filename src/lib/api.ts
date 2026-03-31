import { getToken, clearToken } from "@/auth/token"

const PUBLIC_PREFIXES = ["/api/auth", "/api/public", "/health"]

function isPublic(url: string) {
  try {
    const u = new URL(url, window.location.origin)
    return PUBLIC_PREFIXES.some(p => u.pathname.startsWith(p))
  } catch {
    return PUBLIC_PREFIXES.some(p => url.startsWith(p))
  }
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = getToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }

  if (!isPublic(url)) {
    if (!token) throw new Error("AUTH_REQUIRED")
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    throw new Error("INVALID_TOKEN")
  }

  if (res.status === 204) {
    return null
  }

  let data: any = {}
  try { data = await res.json() } catch {}

  if (!res.ok) {
    throw new Error(data?.error || "REQUEST_FAILED")
  }

  return data
}

export const apiFetch = apiRequest

type ApiOptions = RequestInit & { data?: unknown }

function normalizeBody(data: unknown, body: BodyInit | null | undefined) {
  if (data !== undefined) return data instanceof FormData ? data : JSON.stringify(data)
  return body
}

const api = {
  get: (path: string, options: ApiOptions = {}) => apiRequest(path, { ...options, method: "GET" }),
  post: (path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest(path, { ...options, method: "POST", body: normalizeBody(data, options.body) }),
  put: (path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest(path, { ...options, method: "PUT", body: normalizeBody(data, options.body) }),
  patch: (path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest(path, { ...options, method: "PATCH", body: normalizeBody(data, options.body) }),
  delete: (path: string, options: ApiOptions = {}) => apiRequest(path, { ...options, method: "DELETE" }),
}

export default api
