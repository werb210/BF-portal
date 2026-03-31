import { getToken as getApiToken, getTokenOrFail as getApiTokenOrFail, setToken as setApiToken } from "@/lib/apiClient";

const USER_KEY = "boreal_staff_user";

export function getToken(): string | null {
  return getApiToken();
}

export function getTokenOrFail(): string {
  return getApiTokenOrFail();
}

export function saveToken(token: string) {
  if (!token || token.trim() === "" || token === "undefined" || token === "null") {
    throw new Error("[INVALID TOKEN]");
  }

  setApiToken(token);
}

export function setToken(token: string) {
  saveToken(token);
}

export function clearToken() {
  setApiToken(null);
}

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
