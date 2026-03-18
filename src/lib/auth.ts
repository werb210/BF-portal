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
