// BF_PORTAL_SECURE_TOKEN_STORAGE_v422
// BF_PORTAL_v789_NATIVE_SESSION_MEMORY - reads and writes go through the session store: localStorage on web,
// an in-memory cache written through to the Keychain on native.
import { readSessionItem, removeSessionItem, writeSessionItem } from "./secureStore";

const STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "auth_token";

function emitStorageEvent(oldValue: string | null, newValue: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      oldValue,
      newValue,
      storageArea: window.localStorage,
      url: window.location.href,
    }),
  );
}

export function getAuthToken(): string | null {
  return readSessionItem(STORAGE_KEY);
}

export function setAuthToken(token: string) {
  const oldValue = readSessionItem(STORAGE_KEY);
  writeSessionItem(STORAGE_KEY, token);
  emitStorageEvent(oldValue, token);
}

// BF_PORTAL_v868_SLIDING_REFRESH - the refresh token every staff sign-in now returns. The portal trades it in
// (src/auth/sessionRefresh.ts) for a new access token and a new refresh token while staff keep using it, up to 30 days.
export const REFRESH_STORAGE_KEY = "auth_refresh_token";

export function getRefreshToken(): string | null {
  return readSessionItem(REFRESH_STORAGE_KEY);
}

export function setRefreshToken(token: string) {
  writeSessionItem(REFRESH_STORAGE_KEY, token);
}

export function clearRefreshToken() {
  if (readSessionItem(REFRESH_STORAGE_KEY) !== null) removeSessionItem(REFRESH_STORAGE_KEY);
}

export function clearAuthToken() {
  const oldValue = readSessionItem(STORAGE_KEY);
  removeSessionItem(STORAGE_KEY);
  clearRefreshToken(); // BF_PORTAL_v868_SLIDING_REFRESH - signed out means the refresh token goes too
  // BF_PORTAL_BLOCK_v533 - nothing was signed in, so there is no sign-out to announce.
  if (oldValue !== null) emitStorageEvent(oldValue, null);
}

export const authToken = {
  get: getAuthToken,
  set: setAuthToken,
  clear: clearAuthToken,
};

export const getToken = getAuthToken;
export const setToken = setAuthToken;
export const clearToken = clearAuthToken;
export const AUTH_STORAGE_KEY = STORAGE_KEY;
