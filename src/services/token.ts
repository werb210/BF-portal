import { clearToken, getToken, setToken } from "@/lib/auth";

const USER_KEY = "boreal_staff_user";

export function setStoredAccessToken(token: string) {
  setToken(token);
}

export function getStoredAccessToken(): string | null {
  return getToken();
}

export function clearStoredAuth() {
  clearToken();
  sessionStorage.removeItem(USER_KEY);
}

export function setStoredUser(user: unknown) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
