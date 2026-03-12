import { clearToken, getToken, setToken } from "@/auth/tokenStorage";

const USER_KEY = "boreal_staff_user";

export function setStoredAccessToken(token: string) {
  setToken(token);
}

export function getStoredAccessToken(): string | null {
  return getToken();
}

export function clearStoredAuth() {
  clearToken();
  localStorage.removeItem(USER_KEY);
}

export function setStoredUser(user: unknown) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
