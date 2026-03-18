import { clearToken as clearAuthToken, getToken as getAuthToken, setToken as setAuthToken } from "@/lib/auth";

export function getToken(): string | null {
  return getAuthToken();
}

export function setToken(token: string) {
  setAuthToken(token);
}

export function clearToken() {
  clearAuthToken();
}
