// BF_PORTAL_LAZY_RETRY_v784 - after a deploy, an open tab still references the
// old hashed chunk names (e.g. /assets/LendersPage-abc123.js) which no longer
// exist on the server. The dynamic import then rejects with "Failed to fetch
// dynamically imported module" and the screen crashes. Reload the page once
// to pick up the new index.html; if we already reloaded in the last 30s,
// rethrow so the ErrorBoundary shows its "portal was updated" message
// instead of looping.
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export const CHUNK_RELOAD_KEY = "bf_chunk_reload_at";
export const CHUNK_RELOAD_WINDOW_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /ChunkLoadError/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: unknown }).name;
  const message = (error as { message?: unknown }).message;
  const text = `${typeof name === "string" ? name : ""} ${typeof message === "string" ? message : String(error)}`;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

function readLastReload(): number {
  try {
    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * Reloads the page once. Returns false (and does nothing) when a reload
 * already happened within the guard window, so callers can surface the error.
 */
export function reloadOnceForChunkError(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  const last = readLastReload();
  if (last && now - last < CHUNK_RELOAD_WINDOW_MS) return false;
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    // Without storage we cannot guard against a loop, so do not reload.
    return false;
  }
  window.location.reload();
  return true;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceForChunkError()) {
        // The page is reloading; never resolve so nothing renders meanwhile.
        return new Promise<{ default: T }>(() => undefined);
      }
      throw error;
    }
  });
}

export default lazyWithRetry;
