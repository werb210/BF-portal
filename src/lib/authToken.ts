const STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY;

if (!STORAGE_KEY) {
  throw new Error("VITE_JWT_STORAGE_KEY is required");
}

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
  emitStorageEvent(oldValue, token);
}

export function clearAuthToken() {
  const oldValue = localStorage.getItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  emitStorageEvent(oldValue, null);
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
