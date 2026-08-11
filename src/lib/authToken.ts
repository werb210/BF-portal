import { mirrorTokenToWidget } from "@/native/widgetBridge"; // BF_PORTAL_WIDGET_BRIDGE_v28

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
  emitStorageEvent(oldValue, token);
  // BF_PORTAL_WIDGET_BRIDGE_v28 - not awaited: the caller is a sign-in path and
  // must not wait on, or fail because of, a native side-effect.
  void mirrorTokenToWidget(token);
}

export function clearAuthToken() {
  const oldValue = localStorage.getItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  emitStorageEvent(oldValue, null);
  // BF_PORTAL_WIDGET_BRIDGE_v28 - signing out MUST reach the widget, or a tile
  // keeps showing figures from a session the person believes they ended.
  void mirrorTokenToWidget(null);
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
