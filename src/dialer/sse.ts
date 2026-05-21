// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
import { ringPush } from "./debugRing";
type Handler = (event: string, data: any) => void;
let es: EventSource | null = null; const handlers = new Set<Handler>(); let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
function tokenFromStorage(): string | null { try { return localStorage.getItem(import.meta.env.VITE_JWT_STORAGE_KEY || "auth_token"); } catch { return null; } }
function attach(token: string, silo: string) {
  const base = (import.meta.env.VITE_API_BASE_URL || "https://server.boreal.financial").replace(/\/$/, "");
  const url = `${base}/api/realtime/stream?token=${encodeURIComponent(token)}&silo=${encodeURIComponent(silo)}`;
  ringPush("sse.connect", { url: url.replace(token, "<token>") }); es = new EventSource(url);
  es.addEventListener("hello", (ev: any) => ringPush("sse.hello", safeJson(ev.data)));
  const fanOut = (event: string) => (ev: MessageEvent) => { const data = safeJson(ev.data); ringPush(`sse.${event}`, data); handlers.forEach((h) => h(event, data)); };
  for (const e of ["conference.update","conference.incoming","conference.incoming.answered","recording.update","transcript.live","transcript.live.ended","transcript.completed"]) es.addEventListener(e, fanOut(e) as any);
  es.onerror = () => { ringPush("sse.error.reconnect-in-3s"); es?.close(); es = null; if (!reconnectTimer) reconnectTimer = setTimeout(() => { reconnectTimer = null; startSse(silo); }, 3000); };
}
function safeJson(s: string): any { try { return JSON.parse(s); } catch { return s; } }
export function startSse(silo: string): void { if (es) return; const t = tokenFromStorage(); if (!t) return; attach(t, silo); }
export function stopSse(): void { es?.close(); es = null; if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; } }
export function onSse(h: Handler): () => void { handlers.add(h); return () => handlers.delete(h); }
