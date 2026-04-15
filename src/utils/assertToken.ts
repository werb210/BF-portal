import { roleValues, type UserRole } from "@/utils/roles";

export type TokenPayload = {
  sub: string;
  role: UserRole;
  exp: number;
  iat: number;
  [key: string]: unknown;
};

const decodeBase64 = (value: string) => {
  if (typeof atob === "function") {
    return atob(value);
  }
  throw new Error("No base64 decoder available");
};

export const decodeTokenPayload = (token: string): Record<string, unknown> => {
  const [, payload] = token.split(".");
  if (!payload) {
    throw new Error("Invalid token: missing payload");
  }
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const json = decodeBase64(padded);
  return JSON.parse(json) as Record<string, unknown>;
};

export const assertToken = (token: string): TokenPayload => {
  if (!token) {
    throw new Error("Missing auth token");
  }

  const payload = decodeTokenPayload(token);
  const sub = payload.sub;
  const role = payload.role;
  const exp = payload.exp;
  const iat = payload.iat;

  if (typeof sub !== "string" || !sub) {
    throw new Error("Token payload missing sub");
  }

  if (typeof role !== "string" || !role) {
    throw new Error("Token payload missing role");
  }

  if (role === role.toLowerCase()) {
    throw new Error(`Token role is lowercase: ${role}`);
  }

  if (!roleValues.includes(role as UserRole)) {
    throw new Error(`Token role is invalid: ${role}`);
  }

  if (typeof exp !== "number") {
    throw new Error("Token payload missing exp");
  }

  if (typeof iat !== "number") {
    throw new Error("Token payload missing iat");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (exp < nowSeconds) {
    throw new Error(`Token expired at ${exp}`);
  }

  return {
    ...payload,
    sub,
    role: role as UserRole,
    exp,
    iat
  };
};
