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

export function clearAuthToken() {
  const oldValue = readSessionItem(STORAGE_KEY);
  removeSessionItem(STORAGE_KEY);
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
