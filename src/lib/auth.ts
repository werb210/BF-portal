import { normalizePhone } from "@/utils/phone";

const API = "https://api.staff.boreal.financial/api";
const CANONICAL_TOKEN_KEY = "bf_token";
const LEGACY_TOKEN_KEYS = ["token", "auth_token", "portal_token", "jwt"] as const;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const normalizeToken = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const migrateLegacyTokenIfNeeded = (): string | null => {
  if (!canUseStorage()) return null;

  const canonical = normalizeToken(window.localStorage.getItem(CANONICAL_TOKEN_KEY));
  if (canonical) return canonical;

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacyToken = normalizeToken(window.localStorage.getItem(key));
    if (!legacyToken) continue;
    window.localStorage.setItem(CANONICAL_TOKEN_KEY, legacyToken);
    window.localStorage.removeItem(key);
    return legacyToken;
  }

  return null;
};

export function setToken(token: string) {
  if (!canUseStorage()) return;
  const normalized = normalizeToken(token);
  if (!normalized) {
    window.localStorage.removeItem(CANONICAL_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(CANONICAL_TOKEN_KEY, normalized);
}

export function getToken() {
  if (!canUseStorage()) return null;
  const canonical = normalizeToken(window.localStorage.getItem(CANONICAL_TOKEN_KEY));
  if (canonical) return canonical;
  return migrateLegacyTokenIfNeeded();
}

export function clearToken() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CANONICAL_TOKEN_KEY);
  for (const key of LEGACY_TOKEN_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export async function sendOtp(phone: string) {
  const normalized = normalizePhone(phone);

  console.log("[SEND OTP]", normalized);

  const res = await fetch(`${API}/auth/otp/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: normalized }),
  });

  const data = await res.json();
  console.log("[SEND OTP RESPONSE]", data);

  if (!res.ok) throw new Error(data.message || "Send OTP failed");

  return data;
}

export async function verifyOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone);

  const payload = {
    phone: normalized,
    code: code.trim(),
  };

  console.log("[VERIFY OTP PAYLOAD]", payload);

  const res = await fetch(`${API}/auth/otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("[VERIFY OTP RESPONSE]", data);

  if (!res.ok) throw new Error(data.message || "Verify OTP failed");

  return data;
}
