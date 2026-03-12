import { API_BASE } from "../config/apiBase"

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`

  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json()
}

export async function request(
  path: string,
  options: RequestInit = {}
) {
  const base =
    import.meta.env.VITE_API_URL ||
    "https://api.staff.boreal.financial"

  const url =
    path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? "" : "/"}${path}`

  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API ${res.status}`)
  }

  return res.json()
}

export const api = {
  request
}

export default api
