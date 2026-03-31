import { decodeJwt } from "@/auth/jwt";
import { clearToken, getToken } from "@/auth/token";

import { apiFetch } from "@/api/client";

function hasValidToken() {
  const token = getToken();
  if (!token) return true;

  if (!token.includes(".")) return true;

  const payload = decodeJwt(token);
  if (!payload) return false;

  if (!payload.exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

export function validateStartupToken() {
  if (hasValidToken()) return true;
  clearToken();
  window.location.assign("/login");
  return false;
}

export async function checkBackend() {
  const res = await apiFetch("/api/health", { method: "GET", skipAuth: true });
  return res.success;
}
