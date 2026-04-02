import { env } from "@/config/env";

export const authToken = {
  get(): string | null {
    return localStorage.getItem(env.JWT_STORAGE_KEY);
  },

  set(token: string) {
    localStorage.setItem(env.JWT_STORAGE_KEY, token);
  },

  clear() {
    localStorage.removeItem(env.JWT_STORAGE_KEY);
  },
};

export const getToken = () => authToken.get();
export const setToken = (token: string) => authToken.set(token);
export const clearToken = () => authToken.clear();
