import { env } from "@/config/env";

export function getToken(): string | null {
  return localStorage.getItem(env.JWT_STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(env.JWT_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(env.JWT_STORAGE_KEY);
}
