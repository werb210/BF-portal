import { clearToken, getToken } from "@/lib/authToken";
import { decodeJwt } from "@/auth/jwt";

const readRoleFromToken = (token: string | null): string | null => {
  const payload = decodeJwt(token);
  if (!payload || typeof payload !== "object") return null;
  const role =
  payload.role ??
  (payload as Record<string, unknown>)[
    "https://schemas.microsoft.com/ws/2008/06/identity/claims/role"
  ];
  return typeof role === "string" ? role : null;
};

export function getUserRole(): string | null {
  return readRoleFromToken(getToken());
}

export function clearAuth() {
  clearToken();
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export { getToken as getAccessToken };
