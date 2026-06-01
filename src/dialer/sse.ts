// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
// BF_PORTAL_BLOCK_v701_SSE_SINGLETON_v1 — the realtime stream was able to pile up
// (sleep/wake reconnects + provider re-mounts) and exhaust the browser's ~6
// connections-per-host budget, starving /api/portal/applications and friends so the
// portal hung on "Loading…". This hardens it to a guaranteed single connection:
// close-before-open, a generation token so stale reconnect timers are ignored after
// stop/restart, capped exponential backoff instead of a blind 3s loop, and reconnect
// on network-wake instead of accumulating dead sockets.
import { ringPush } from "./debugRing";
type Handler = (event: string, data: any) => void;

let es: EventSource | null = null;
const handlers = new Set<Handler>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;          // bumped on every (re)start/stop; invalidates stale reconnects
let backoffMs = 3000;
const BACKOFF_MAX = 30000;
let currentSilo: string | null = null;
let wakeListenersInstalled = false;

function tokenFromStorage(): string | null {
  try { return localStorage.getItem(import.meta.env.VITE_JWT_STORAGE_KEY || "auth_token"); } catch { return null; }
}
function safeJson(s: string): any { try { return JSON.parse(s); } catch { return s; } }

function clearReconnect(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function closeEs(): void {
  if (es) { try { es.close(); } catch { /* ignore */ } es = null; }
}

function installWakeListeners(): void {
  if (wakeListenersInstalled || typeof window === "undefined") return;
  wakeListenersInstalled = true;
  const wake = () => {
    // On network/tab wake, if we should be connected but aren't, reconnect immediately.
    if (currentSilo && (!es || es.readyState === 2 /* CLOSED */)) {
      clearReconnect();
      backoffMs = 3000;
      startSse(currentSilo);
    }
  };
  window.addEventListener("online", wake);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") wake(); });
}

function attach(token: string, silo: string): void {
  // Guaranteed single socket: always tear down any prior one first.
  closeEs();
  generation += 1;
  const myGen = generation;
  const base = (import.meta.env.VITE_API_BASE_URL || "https://server.boreal.financial").replace(/\/$/, "");
  const url = `${base}/api/realtime/stream?token=${encodeURIComponent(token)}&silo=${encodeURIComponent(silo)}`;
  ringPush("sse.connect", { url: url.replace(token, "<token>") });
  es = new EventSource(url);
  es.onopen = () => { backoffMs = 3000; };
  es.addEventListener("hello", (ev: any) => ringPush("sse.hello", safeJson(ev.data)));
  const fanOut = (event: string) => (ev: MessageEvent) => { const data = safeJson(ev.data); ringPush(`sse.${event}`, data); handlers.forEach((h) => h(event, data)); };
  for (const e of ["conference.update","conference.incoming","conference.incoming.answered","recording.update","transcript.live","transcript.live.ended","transcript.completed"]) es.addEventListener(e, fanOut(e) as any);
  es.onerror = () => {
    ringPush("sse.error.reconnect", { backoffMs });
    closeEs();
    // Only the current generation may schedule a reconnect; stop/restart invalidates this.
    if (myGen !== generation) return;
    if (reconnectTimer) return;
    const delay = backoffMs;
    backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (myGen !== generation) return;       // a newer start/stop happened — abandon
      if (currentSilo) startSse(currentSilo);
    }, delay);
  };
}

export function startSse(silo: string): void {
  currentSilo = silo;
  installWakeListeners();
  // Singleton: if a socket is already open or connecting, do nothing.
  if (es && es.readyState !== 2 /* CLOSED */) return;
  const t = tokenFromStorage();
  if (!t) return;
  clearReconnect();
  attach(t, silo);
}

export function stopSse(): void {
  generation += 1;            // invalidate any pending reconnect from the old generation
  currentSilo = null;
  clearReconnect();
  closeEs();
  backoffMs = 3000;
}

export function onSse(h: Handler): () => void { handlers.add(h); return () => handlers.delete(h); }
