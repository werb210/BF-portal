// BF_PORTAL_SECURE_TOKEN_STORAGE_v422
import { secureSet, secureRemove, isNative } from "./secureStore";

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
  return localStorage.getItem(STORAGE_KEY);
}

export function setAuthToken(token: string) {
  const oldValue = localStorage.getItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, token);
  // v422 - mirror to the Keychain on native. Fails closed: if the Keychain is
  // unavailable we clear the plain copy rather than leave a token in UserDefaults.
  if (isNative()) {
    void secureSet(STORAGE_KEY, token).catch(() => {
      localStorage.removeItem(STORAGE_KEY);
      throw new Error("secure_storage_unavailable");
    });
  }
  emitStorageEvent(oldValue, token);
}

export function clearAuthToken() {
  const oldValue = localStorage.getItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  if (isNative()) void secureRemove(STORAGE_KEY);
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
