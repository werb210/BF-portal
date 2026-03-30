import { apiFetch, clearToken, getToken, setToken } from "./api";

let currentUser: any = null;

export async function initAuth() {
  try {
    currentUser = await apiFetch("/api/auth/me");
  } catch {
    clearToken();
    currentUser = null;
  }

  return currentUser;
}

export async function startOtp(phone: string) {
  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const res = await apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

  if ((res as any)?.token) setToken((res as any).token);
  currentUser = (res as any)?.user ?? null;

  return res;
}

export async function getMe() {
  if (!currentUser) {
    await initAuth();
  }
  return currentUser;
}

export function logout() {
  clearToken();
  currentUser = null;
}

export async function ensureValidSession() {
  try {
    await apiFetch("/api/auth/me");
  } catch {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export { setToken, clearToken, getToken };
