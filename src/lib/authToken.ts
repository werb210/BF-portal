import { ENV } from "@/config/env";
import { decodeJwt } from "@/auth/jwt";
import { clearToken as clearCanonicalToken, getToken as getCanonicalToken, setToken as setCanonicalToken } from "@/lib/auth";

const ACCESS_TOKEN_KEY = ENV.JWT_STORAGE_KEY;

let inMemoryAccessToken: string | null = null;

const readStoredToken = (): string | null => {
  return getCanonicalToken();
};

const writeStoredToken = (token: string | null) => {
  if (!token) {
    clearCanonicalToken();
    return;
  }
  setCanonicalToken(token);
};

const isExpired = (token: string | null) => {
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
};

export function getAccessToken(): string | null {
  const token = inMemoryAccessToken ?? readStoredToken();
  if (isExpired(token)) {
    clearAccessToken();
    return null;
  }
  inMemoryAccessToken = token;
  return token;
}

export function setAccessToken(token: string) {
  inMemoryAccessToken = token;
  writeStoredToken(token);
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
  writeStoredToken(null);
}

export { ACCESS_TOKEN_KEY };
