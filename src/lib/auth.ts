import { normalizePhone } from "../utils/phone";

const TOKEN_KEY = "bf_token";
const LEGACY_TOKEN_KEYS = ["token", "auth_token", "portal_token", "jwt"] as const;

const getStorage = (): Storage | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
};

export function setToken(token: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;

  const canonicalToken = storage.getItem(TOKEN_KEY);
  if (canonicalToken) return canonicalToken;

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacyToken = storage.getItem(key);
    if (!legacyToken) continue;
    storage.setItem(TOKEN_KEY, legacyToken);
    storage.removeItem(key);
    return legacyToken;
  }

  return null;
}

export function clearToken() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  for (const key of LEGACY_TOKEN_KEYS) {
    storage.removeItem(key);
  }
}

export async function sendOtp(phone: string) {
  const normalized = normalizePhone(phone);

  const res = await fetch("/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: normalized }),
  });

  if (!res.ok) throw new Error("OTP send failed");

  return res.json();
}

export async function verifyOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone);

  const res = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: normalized, code }),
  });

  if (!res.ok) throw new Error("OTP verify failed");

  return res.json();
}
