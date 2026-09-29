// BF_PORTAL_TEAM_PHASE_C_v672 - Team chat Phase C in the portal.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

export type TeamCard = { kind: "contact" | "application"; id: string; title: string; subtitle: string; url: string };
const REF = /\/(crm\/contacts|contacts|applications)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
const cache = new Map<string, TeamCard | null>();
const waiting = new Map<string, Promise<void>>();

export function cardRefs(text: string): string[] {
  const out: string[] = [];
  for (const m of String(text ?? "").matchAll(REF)) {
    const key = (String(m[1]).toLowerCase() === "applications" ? "application:" : "contact:") + String(m[2]).toLowerCase();
    if (!out.includes(key)) out.push(key);
    if (out.length >= 5) break;
  }
  return out;
}

async function fetchCards(keys: string[]): Promise<void> {
  const missing = keys.filter((k) => !cache.has(k) && !waiting.has(k));
  if (missing.length) {
    const p = api<{ cards?: TeamCard[] }>("/api/team/cards", { params: { ids: missing.join(",") } })
      .then((r) => { for (const k of missing) cache.set(k, (r?.cards ?? []).find((c) => c.kind + ":" + c.id === k) ?? null); })
      .catch(() => { for (const k of missing) cache.set(k, null); })
      .finally(() => { for (const k of missing) waiting.delete(k); });
    for (const k of missing) waiting.set(k, p);
  }
  await Promise.all(keys.map((k) => waiting.get(k)).filter(Boolean));
}

export function TeamCards({ text }: { text: string }) {
  const keys = cardRefs(text);
  return keys.length ? <LinkedCards keys={keys} /> : null;
}

function LinkedCards({ keys }: { keys: string[] }) {
  const navigate = useNavigate();
  const [, bump] = useState(0);
  const joined = keys.join(",");
  useEffect(() => {
    if (!joined) return;
    let live = true;
    void fetchCards(joined.split(",")).then(() => { if (live) bump((n) => n + 1); });
    return () => { live = false; };
  }, [joined]);
  const cards = keys.map((k) => cache.get(k)).filter((c): c is TeamCard => Boolean(c));
  if (!cards.length) return null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>{cards.map((c) => (
    <button key={c.kind + c.id} type="button" data-testid="team-card" onClick={() => navigate(c.url)} style={{ textAlign: "left", display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", maxWidth: 360 }}>
      <span style={{ fontSize: 18 }}>{c.kind === "application" ? "\u{1F4BC}" : "\u{1F464}"}</span>
      <span style={{ minWidth: 0 }}><span style={{ display: "block", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>{c.subtitle && <span style={{ display: "block", fontSize: 12, color: "var(--ui-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subtitle}</span>}</span>
    </button>
  ))}</div>;
}

export function remindTime(choice: string, now = new Date()): string | null {
  if (choice === "20m") return new Date(now.getTime() + 20 * 60_000).toISOString();
  if (choice === "1h") return new Date(now.getTime() + 60 * 60_000).toISOString();
  if (choice === "3h") return new Date(now.getTime() + 3 * 60 * 60_000).toISOString();
  if (choice === "tomorrow") { const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(9, 0, 0, 0); return t.toISOString(); }
  return null;
}

const CHOICES: Array<[string, string]> = [["save", "Save for later"], ["20m", "Remind me in 20 minutes"], ["1h", "Remind me in 1 hour"], ["3h", "Remind me in 3 hours"], ["tomorrow", "Remind me tomorrow at 9 am"], ["remove", "Remove from Saved"]];

export function SaveMenu({ messageId, align = "left" }: { messageId: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const wrap = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  async function pick(choice: string) {
    setOpen(false);
    try {
      if (choice === "remove") { await api.delete(`/api/team/messages/${messageId}/save`); setNote("Removed"); }
      else { await api.post(`/api/team/messages/${messageId}/save`, { remind_at: remindTime(choice) }); setNote(choice === "save" ? "Saved" : "Reminder set"); }
    } catch { setNote("Couldn't save"); }
    setTimeout(() => setNote(null), 2500);
  }
  return <span ref={wrap} style={{ position: "relative" }}>
    <button type="button" data-testid="team-save" title="Save for later or remind me" onClick={() => setOpen((v) => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", padding: 0, fontSize: 12 }}>{note ?? "Save"}</button>
    {open && <div style={{ position: "absolute", bottom: "calc(100% + 4px)", [align]: 0, zIndex: 40, minWidth: 210, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.15)", padding: 4 } as CSSProperties}>{CHOICES.map(([k, label]) => <button key={k} type="button" onClick={() => void pick(k)} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: k === "remove" ? "#ff3b30" : "var(--ui-text)" }}>{label}</button>)}</div>}
  </span>;
}

type SavedRow = { message_id: string; channel_id: string; thread_root_id: string | null; body: string; bot: string | null; sender_id: string | null; remind_at: string | null; reminded_at: string | null; channel_kind: string; channel_name: string | null };

export function SavedPanel({ nameOf, onClose, onOpen }: { nameOf: (id: string | null) => string; onClose: () => void; onOpen: (channelId: string, threadRootId: string | null) => void }) {
  const [rows, setRows] = useState<SavedRow[] | null>(null);
  const load = () => void api<{ saved?: SavedRow[] }>("/api/team/saved").then((r) => setRows(r?.saved ?? [])).catch(() => setRows([]));
  useEffect(load, []);
  const when = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
    <div onClick={(e) => e.stopPropagation()} data-testid="team-saved-panel" style={{ width: 520, maxWidth: "94vw", maxHeight: "78vh", background: "var(--ui-surface-strong)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ui-text)" }}>Saved for later</div>
      <div style={{ overflowY: "auto" }}>{rows === null && <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Loading{"\u2026"}</div>}{rows?.length === 0 && <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Nothing saved. Use Save on any message.</div>}{rows?.map((r) => <div key={r.message_id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 4px", borderBottom: "1px solid var(--ui-surface-muted)" }}>
        <div onClick={() => onOpen(r.channel_id, r.thread_root_id)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{(r.channel_kind === "channel" && r.channel_name ? "#" + r.channel_name : r.channel_name || "Direct message") + " \u00B7 " + (r.bot || nameOf(r.sender_id))}{r.remind_at ? (r.reminded_at ? " \u00B7 reminded " : " \u00B7 \u23F0 ") + when(r.remind_at) : ""}</div><div style={{ fontSize: 14, color: "var(--ui-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.body || "Attachment"}</div></div>
        <button type="button" onClick={() => void api.delete(`/api/team/messages/${r.message_id}/save`).then(load).catch(load)} title="Remove" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", fontSize: 16 }}>{"\u00D7"}</button>
      </div>)}</div>
      <button type="button" onClick={onClose} style={{ alignSelf: "flex-end", padding: "8px 16px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 8, cursor: "pointer" }}>Close</button>
    </div>
  </div>;
}
