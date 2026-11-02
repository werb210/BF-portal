// BF_PORTAL_v868_SLIDING_REFRESH - keeps staff signed in while they use the portal, up to 30 days.
//
// Ported from KS-Portal #39. Staff used to be signed out every 7 days: the sign-in gave one 7-day access token and
// nothing to renew it with. Every staff sign-in (text code, passkey) now also returns a refresh token. While the
// portal is open (the browser, the iPad app, or the Mac desktop shell in desktop/, which loads this same site), once
// the access token is 12 hours old - or within 2 days of expiring - the portal trades the refresh token in
// (POST /api/auth/refresh) for a new access token and a new refresh token. The server ends every chain 30 days after
// the sign-in and after 7 idle days. Sign-out revokes the chain.
import { clearRefreshToken, getAuthToken, getRefreshToken, setAuthToken, setRefreshToken } from "@/lib/authToken";

// Sign-in always lives on BF-Server, whatever silo is chosen. The address comes from the build settings (the same order
// as @/config/api) rather than importing @/config/api, which pulls in the silo context.
const API_BASE: string =
  import.meta.env.VITE_BF_API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial";

export const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;
export const REFRESH_BEFORE_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;
export const CHECK_EVERY_MS = 15 * 60 * 1000;
const LOCK_KEY = "auth_refresh_lock";
const LOCK_MS = 30 * 1000;

export type RefreshOutcome = "refreshed" | "not_needed" | "busy" | "signed_out" | "failed";

/** iat / exp (ms) of a JWT, or null when it cannot be read. */
export function tokenTimes(token: string | null | undefined): { iat: number | null; exp: number | null } | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const payload = JSON.parse(json) as { iat?: unknown; exp?: unknown };
    const ms = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v * 1000 : null);
    return { iat: ms(payload.iat), exp: ms(payload.exp) };
  } catch {
    return null;
  }
}

/** Whether to refresh now: only with a refresh token, and when the access token is old, nearly expired or gone. */
export function shouldRefresh(access: string | null, refresh: string | null, now = Date.now()): boolean {
  if (!refresh) return false;
  const t = tokenTimes(access);
  if (!t || t.exp === null) return true;
  if (t.exp - now <= REFRESH_BEFORE_EXPIRY_MS) return true;
  return t.iat !== null && now - t.iat >= REFRESH_AFTER_MS;
}

/** Keep the refresh token a sign-in response carries ({ data: { refreshToken } } or { refreshToken }). */
export function captureRefreshToken(body: unknown): void {
  const b = body as { refreshToken?: unknown; data?: { refreshToken?: unknown } } | null | undefined;
  const token = b?.data?.refreshToken ?? b?.refreshToken;
  if (typeof token === "string" && token.length > 0) setRefreshToken(token);
}

function lockHeld(now: number): boolean {
  try {
    const at = Number(window.localStorage.getItem(LOCK_KEY) ?? 0);
    return Number.isFinite(at) && now - at < LOCK_MS;
  } catch {
    return false;
  }
}

function setLock(value: number | null): void {
  try {
    if (value === null) window.localStorage.removeItem(LOCK_KEY);
    else window.localStorage.setItem(LOCK_KEY, String(value));
  } catch {
    /* storage blocked: tabs may race, the server answers the loser with 409 */
  }
}

let inflight: Promise<RefreshOutcome> | null = null;

/** Refreshes now if it is time (or `force`). Never throws; a failure leaves the current token in place. */
export function refreshSessionNow(opts: { force?: boolean; fetchImpl?: typeof fetch; now?: number } = {}): Promise<RefreshOutcome> {
  if (inflight) return inflight;
  const now = opts.now ?? Date.now();
  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve("not_needed");
  if (!opts.force && !shouldRefresh(getAuthToken(), refresh, now)) return Promise.resolve("not_needed");
  if (lockHeld(now)) return Promise.resolve("busy");
  setLock(now);
  const doFetch = opts.fetchImpl ?? fetch;
  inflight = (async (): Promise<RefreshOutcome> => {
    try {
      const res = await doFetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (res.status === 409) return "busy";
      if (res.status === 401) {
        // The chain ended (30 days, signed out elsewhere, or no longer staff). The access token runs out on its own.
        if (getRefreshToken() === refresh) clearRefreshToken();
        return "signed_out";
      }
      if (!res.ok) return "failed";
      const body = (await res.json().catch(() => null)) as { data?: { token?: unknown; refreshToken?: unknown } } | null;
      const token = body?.data?.token;
      const next = body?.data?.refreshToken;
      if (typeof token !== "string" || typeof next !== "string") return "failed";
      setRefreshToken(next);
      setAuthToken(token);
      return "refreshed";
    } catch {
      return "failed";
    } finally {
      setLock(null);
      inflight = null;
    }
  })();
  return inflight;
}

/** Checks on start, every 15 minutes, and when the window comes back (wake from sleep, tab focus). Returns a stop. */
export function startSessionRefresh(opts: { fetchImpl?: typeof fetch } = {}): () => void {
  if (typeof window === "undefined") return () => undefined;
  const check = () => void refreshSessionNow({ fetchImpl: opts.fetchImpl });
  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };
  check();
  const timer = window.setInterval(check, CHECK_EVERY_MS);
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", check);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Sign-out on this device: tell the server to end the refresh chain (best effort), then forget it. */
export function revokeRefreshOnSignOut(fetchImpl: typeof fetch = fetch): void {
  const refresh = getRefreshToken();
  if (!refresh) return;
  clearRefreshToken();
  void fetchImpl(`${API_BASE}/api/auth/refresh/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
    keepalive: true,
  }).catch(() => undefined);
}
