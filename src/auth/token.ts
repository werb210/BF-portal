import { decodeJwt as decodeJwtPayload } from "./jwt";

export function getToken(): string | null {
  const t = localStorage.getItem("token")
  if (!t || t === "null" || t === "undefined") return null
  return t
}

export function setToken(t: string) {
  localStorage.setItem("token", t)
}

export function clearToken() {
  localStorage.removeItem("token")
}

export function decodeJwt(token?: string | null) {
  if (!token) return null;
  return decodeJwtPayload(token);
}
