import { apiRequest } from "./apiClient";

let currentUser: any = null;

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getTokenOrFail(): string {
  const token = localStorage.getItem("token");

  if (!token || token.trim() === "") {
    console.error("[AUTH] Missing token at request time");
    throw new Error("NOT_AUTHENTICATED");
  }

  return token;
}

export function saveToken(token: string) {
  if (!token || token.trim() === "") {
    throw new Error("[TOKEN SAVE FAILED] EMPTY TOKEN");
  }

  localStorage.setItem("token", token);

  const verify = localStorage.getItem("token");

  if (!verify) {
    throw new Error("[TOKEN SAVE FAILED] WRITE FAILED");
  }

  console.log("[TOKEN SAVED]", token.slice(0, 12));
}

export function setToken(token: string) {
  saveToken(token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function initAuth() {
  try {
    currentUser = await apiRequest("/api/auth/me");
  } catch {
    clearToken();
    currentUser = null;
  }

  return currentUser;
}

export async function startOtp(phone: string): Promise<{ ok?: boolean; [key: string]: unknown }> {
  return apiRequest<{ ok?: boolean; [key: string]: unknown }>("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok?: boolean; token?: string; user?: any; nextPath?: string; [key: string]: unknown }> {
  const res = await apiRequest<{ ok?: boolean; token?: string; user?: any; nextPath?: string; [key: string]: unknown }>("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

  if (res?.token) {
    saveToken(res.token);
  }
  currentUser = res?.user ?? null;

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
    await apiRequest("/api/auth/me");
  } catch {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}
