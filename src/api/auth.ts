import { apiRequest } from "@/lib/apiClient";
import { setToken } from "@/services/token";

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
  return apiRequest<{ ok?: boolean; [key: string]: unknown }>("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const response = await apiRequest<{ ok?: boolean; token?: string; user?: unknown; [key: string]: unknown }>(
    "/api/auth/otp/verify",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (response?.token) {
    setToken(response.token);
  }

  currentUser = response?.user ?? null;
  return response;
}

export function clearAuthUser() {
  currentUser = null;
}
