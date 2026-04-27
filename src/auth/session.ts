const STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "auth_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  // BF_MSAL_DIAG_v24
  console.log("[msal.diag] auth_token.write", {
    ts: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    tokenLength: token?.length ?? 0
  });
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
