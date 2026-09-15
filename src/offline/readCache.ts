// BF_PORTAL_OFFLINE_READ_CACHE_v252
// Saved copies of recently viewed contacts, companies and applications, served
// read-only when the device has no connection. Deliberately narrow:
//   - native app only (behind the v243 Face ID lock), never a shared browser
//   - identity and banking numbers are stripped before anything is stored
//   - at most 40 records, each kept 24 hours, wiped on sign-out
import { Capacitor } from "@capacitor/core";

const KEY = "boreal_portal_read_cache_v1";
export const MAX_ENTRIES = 40;
export const TTL_MS = 24 * 60 * 60 * 1000;
export const SAVED_COPY_EVENT = "boreal:offline-saved-copy";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CACHEABLE = [
  new RegExp(`^/api/crm/(contacts|companies)/${UUID}$`, "i"),
  new RegExp(`^/api/crm/(contacts|companies)/${UUID}/timeline$`, "i"),
  new RegExp(`^/api/applications/${UUID}/details$`, "i"),
];
const SENSITIVE = /^(sin|ssn|sin_?ssn|social_?insurance_?number|social_?security_?number|tax_?id|ein|dob|date_?of_?birth|birth_?date|account_?number|routing_?number|transit_?number|institution_?number|card_?number|password|token|access_?token|refresh_?token)$/i;

type Entry = { key: string; savedAt: number; value: unknown };
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function store(): Store | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export function isCacheablePath(path: string): boolean {
  return CACHEABLE.some((re) => re.test(path));
}

export function cacheKeyFor(path: string, silo: string, native: boolean = safeNative()): string | null {
  if (!native || !isCacheablePath(path)) return null;
  return `${silo}:${path}`;
}

function safeNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export function stripSensitive(value: unknown, depth = 0): unknown {
  if (depth > 12 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => stripSensitive(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE.test(k)) continue;
    out[k] = stripSensitive(v, depth + 1);
  }
  return out;
}

function readAll(s: Store | null): Entry[] {
  try {
    const parsed = JSON.parse(s?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineCopy(key: string, value: unknown, s: Store | null = store(), now = Date.now()): void {
  const rest = readAll(s).filter((e) => e.key !== key && now - e.savedAt < TTL_MS);
  const next = [{ key, savedAt: now, value: stripSensitive(value) }, ...rest].slice(0, MAX_ENTRIES);
  try { s?.setItem(KEY, JSON.stringify(next)); } catch { /* quota: saved copies are best-effort */ }
}

export function readOfflineCopy(key: string, s: Store | null = store(), now = Date.now()): unknown | undefined {
  const hit = readAll(s).find((e) => e.key === key);
  if (!hit || now - hit.savedAt >= TTL_MS) return undefined;
  return hit.value;
}

export function clearOfflineCopies(s: Store | null = store()): void {
  try { s?.removeItem(KEY); } catch { /* nothing to clear */ }
}

export function announceSavedCopy(): void {
  try { window.dispatchEvent(new CustomEvent(SAVED_COPY_EVENT)); } catch { /* non-browser */ }
}
