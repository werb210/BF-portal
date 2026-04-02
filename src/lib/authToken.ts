import { ENV } from "../config/env";

export function getToken(): string | null {
  return localStorage.getItem(ENV.JWT_STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(ENV.JWT_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(ENV.JWT_STORAGE_KEY);
}

// Backward-compatible aliases.
export const ACCESS_TOKEN_KEY = ENV.JWT_STORAGE_KEY;
export const getAccessToken = getToken;
export const setAccessToken = setToken;
export const clearAccessToken = clearToken;
