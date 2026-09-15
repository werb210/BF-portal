// BF_PORTAL_OFFLINE_OUTBOX_v251
// Offline staff actions are kept on the device and replayed through BF-Server
// POST /api/pwa/sync (v250). Only additive BF-silo actions queue (BI and SLF
// servers have no replay endpoint). Items are sent one at a time so one that no
// longer applies never blocks the rest.
import { api, apiForSilo } from "@/api";
import { __apiBaseUrls, getActiveSilo, resolveApiBase } from "@/config/api";

export type OutboxItem = { id: string; path: string; body: Record<string, unknown>; label: string; createdAt: number; status: "pending" | "failed"; error?: string };
const KEY = "boreal_portal_outbox_v1";
const QUEUEABLE = [/^\/api\/crm\/(contacts|companies)\/[0-9a-f-]{36}\/notes$/i, /^\/api\/tasks$/, /^\/api\/tasks\/[0-9a-f-]{36}\/complete$/i, /^\/api\/telephony\/calls\/[A-Za-z0-9_-]{1,64}\/disposition$/];
type Store = Pick<Storage, "getItem" | "setItem">;
const listeners = new Set<() => void>();
function store(): Store | null { try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; } }
export function readOutbox(s: Store | null = store()): OutboxItem[] { try { const raw = s?.getItem(KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function writeOutbox(items: OutboxItem[], s: Store | null = store()): void { try { s?.setItem(KEY, JSON.stringify(items)); } catch { /* storage full or blocked */ } listeners.forEach((listener) => listener()); }
export function subscribeOutbox(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function isQueueablePath(path: string): boolean { return QUEUEABLE.some((re) => re.test(path)); }
export function isNetworkFailure(error: unknown, online: boolean): boolean { if (!online || error instanceof TypeError) return true; const message = String((error as { message?: unknown })?.message ?? ""); return /failed to fetch|network|load failed|offline/i.test(message); }
function newId(): string { try { return crypto.randomUUID(); } catch { return `ob-${Date.now()}-${Math.random().toString(36).slice(2)}`; } }
export function enqueue(path: string, body: Record<string, unknown>, label: string, s: Store | null = store()): OutboxItem { const item: OutboxItem = { id: newId(), path, body, label, createdAt: Date.now(), status: "pending" }; writeOutbox([...readOutbox(s), item], s); return item; }
export function dismissFailed(id: string, s: Store | null = store()): void { writeOutbox(readOutbox(s).filter((item) => !(item.id === id && item.status === "failed")), s); }
type Poster = (path: string, body: unknown) => Promise<any>;
const livePost: Poster = (path, body) => api.post(path, body);
const replayPost: Poster = (path, body) => apiForSilo("BF").post(path, body);
export async function postOrQueue(path: string, body: Record<string, unknown>, label: string, deps: { post?: Poster; online?: boolean; eligible?: boolean; s?: Store | null } = {}): Promise<any> {
  const online = deps.online ?? (typeof navigator === "undefined" ? true : navigator.onLine !== false);
  const eligible = deps.eligible ?? (isQueueablePath(path) && getActiveSilo() === "BF" && resolveApiBase(path) === __apiBaseUrls.bf);
  const post = deps.post ?? livePost;
  if (eligible && !online) { enqueue(path, body, label, deps.s ?? store()); return { queued: true }; }
  try { return await post(path, body); } catch (error) { if (eligible && isNetworkFailure(error, online)) { enqueue(path, body, label, deps.s ?? store()); return { queued: true }; } throw error; }
}
let flushing = false;
export async function flushOutbox(deps: { post?: Poster; s?: Store | null } = {}): Promise<{ sent: number; failed: number }> {
  if (flushing) return { sent: 0, failed: 0 }; flushing = true;
  const s = deps.s ?? store(); const post = deps.post ?? replayPost; let sent = 0; let failed = 0;
  try {
    for (const item of readOutbox(s).filter((entry) => entry.status === "pending")) {
      let response: any;
      try { response = await post("/api/pwa/sync", { actions: [{ id: item.id, method: "POST", path: item.path, body: item.body, idempotencyKey: item.id }] }); } catch { break; }
      const result = (response?.results ?? response?.data?.results ?? [])[0];
      if (result?.status === "succeeded") { writeOutbox(readOutbox(s).filter((entry) => entry.id !== item.id), s); sent += 1; continue; }
      const code = Number(result?.statusCode ?? 0); if (!result || code === 401 || code >= 500) break;
      writeOutbox(readOutbox(s).map((entry) => entry.id === item.id ? { ...entry, status: "failed" as const, error: String(result?.error?.message ?? result?.error?.code ?? "Could not be applied") } : entry), s); failed += 1;
    }
  } finally { flushing = false; }
  return { sent, failed };
}
