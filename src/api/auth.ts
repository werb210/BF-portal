import { apiRequest } from "@/lib/api";
import { setToken } from "@/auth/token";

let currentUser: unknown = null;

export async function initAuth() {
  try {
    currentUser = await apiRequest("/api/auth/me");
  } catch {
    currentUser = null;
  }

  return currentUser;
}

export async function getMe() {
  return apiRequest("/api/auth/me");
}

export async function startOtp(payload: { phone: string }) {
  return apiRequest("/api/auth/start-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await apiRequest("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res || !res.token) {
    throw new Error("INVALID_LOGIN");
  }

  setToken(res.token);
  currentUser = res?.user ?? null;
  return res;
}

export function clearAuthUser() {
  currentUser = null;
}
