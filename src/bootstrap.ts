import { decodeJwt } from "@/auth/jwt";
import { clearToken, getToken } from "@/auth/token";

import { api } from "@/api";

type HealthResponse = {
  ok?: boolean;
  status?: string;
};

function hasValidTokenShape(): boolean {
  const token = getToken();
  if (!token) return true;

  if (!token.includes(".")) return true;

  const payload = decodeJwt(token);
  if (!payload) return false;

  if (!payload.exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

export async function validateStartupToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return true;
  if (!hasValidTokenShape()) {
    clearToken();
    window.location.assign("/login");
    return false;
  }

  try {
    await api("/api/auth/me", { method: "GET" });
    return true;
  } catch {
    clearToken();
    window.location.assign("/login");
    return false;
  }
}

export async function checkBackend(): Promise<boolean> {
  try {
    await api<HealthResponse>("/api/health", {
      method: "GET"
    });
    return true;
  } catch {
    return false;
  }
}
