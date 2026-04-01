import { decodeJwt } from "@/auth/jwt";
import { clearToken, getToken } from "@/auth/token";

import { apiRequest } from "@/api/client";

type ApiResponse<T> = T;

type HealthResponse = {
  ok?: boolean;
  status?: string;
};

function hasValidToken(): boolean {
  const token = getToken();
  if (!token) return true;

  if (!token.includes(".")) return true;

  const payload = decodeJwt(token);
  if (!payload) return false;

  if (!payload.exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

export function validateStartupToken(): boolean {
  if (hasValidToken()) return true;
  clearToken();
  window.location.assign("/login");
  return false;
}

export async function checkBackend(): Promise<boolean> {
  const res = (await apiRequest<HealthResponse>("/api/health", {
    method: "GET",
    skipAuth: true,
  })) as ApiResponse<Awaited<ReturnType<typeof apiRequest<HealthResponse>>>>;

  return res.success;
}
