import { getEnv } from "../config/env";

const { VITE_JWT_STORAGE_KEY } = getEnv();

export function getToken() {
  return localStorage.getItem(VITE_JWT_STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(VITE_JWT_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(VITE_JWT_STORAGE_KEY);
}
