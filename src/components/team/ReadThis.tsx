// BF_PORTAL_READ_THIS_v760 - "Read this" team messages and "Share file" from OneDrive / the Staff Library.
// Send a Read this in Team chat for everyone, or in a direct message for one person. Each reader
// gets "Mark as read"; the sender sees who has read it and who has not (BF-Server v776).
import { useEffect, useState } from "react";
import { api } from "@/api";

export type ReadReceipt = { user_id: string; read_at: string };
export type ReadThisFields = { id: string; sender_id: string | null; read_this?: boolean; read_by?: ReadReceipt[] };

/** Apply a "read_this" socket event (someone marked a message read) to the message list. */
export function applyReadThisEvent<T extends ReadThisFields>(messages: T[], evt: { message_id?: string; user_id?: string; read_at?: string }): T[] {
  if (!evt?.message_id || !evt.user_id) return messages;
  return messages.map((m) => {
    if (m.id !== evt.message_id) return m;
    const list = m.read_by ?? [];
    if (list.some((r) => r.user_id === evt.user_id)) return m;
    return { ...m, read_by: [...list, { user_id: String(evt.user_id), read_at: String(evt.read_at ?? new Date().toISOString()) }] };
  });
}

export function readThisSummary(m: ReadThisFields, memberIds: string[], name: (id: string) => string): { read: string[]; waiting: string[] } {
  const readIds = new Set((m.read_by ?? []).map((r) => r.user_id));
  const others = memberIds.filter((id) => id !== m.sender_id);
  return { read: others.filter((id) => readIds.has(id)).map(name), waiting: others.filter((id) => !readIds.has(id)).map(name) };
}

export function ReadThisBar({ message, meId, memberIds, name, onRead }: { message: ReadThisFields; meId: string | null; memberIds: string[]; name: (id: string) => string; onRead: (receipt: ReadReceipt) => void }) {
  const [busy, setBusy] = useState(false);
  if (!message.read_this) return null;
  const mine = Boolean(meId && message.sender_id === meId);
  const iRead = (message.read_by ?? []).some((r) => r.user_id === meId);
  const s = readThisSummary(message, memberIds, name);
  const mark = async () => {
    setBusy(true);
    try { const r = await api.post<{ receipt?: ReadReceipt }>("/api/team/messages/" + encodeURIComponent(message.id) + "/read-receipt", {}); if (r?.receipt) onRead(r.receipt); }
    catch (err) { console.warn("[read-this] mark failed", err); }
    finally { setBusy(false); }
  };
  return (
    <div data-testid="read-this-bar" style={{ marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d", color: "#0B1F3A", fontSize: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <strong>{"\u{1F4CC}"} Read this</strong>
      {mine ? (
        <span data-testid="read-this-status">{s.read.length ? "Read by " + s.read.join(", ") : "Nobody has read it yet"}{s.waiting.length ? " · Waiting: " + s.waiting.join(", ") : " · Everyone has read it"}</span>
      ) : iRead ? (
        <span style={{ color: "#065f46", fontWeight: 600 }}>{"✓"} You read this</span>
      ) : (
        <button type="button" data-testid="read-this-mark" disabled={busy} onClick={() => void mark()} style={{ background: "#0B1F3A", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{busy ? "Saving..." : "Mark as read"}</button>
      )}
    </div>
  );
}

type DriveItem = { id: string; name: string; webUrl: string | null; isFolder: boolean; lastModified?: string | null };

/** Pick a file from the Staff Library or your own OneDrive; returns a company-only link. */
export function ShareFileModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (file: { name: string; url: string }) => void }) {
  const [tab, setTab] = useState<"library" | "mine">("library");
  const [stack, setStack] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: "Staff Library" }]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [libUrl, setLibUrl] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const folder = stack[stack.length - 1] ?? { id: null, name: "Staff Library" };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBusy(true); setError(null);
    const path = tab === "library"
      ? "/api/o365/library" + (folder.id ? "?item=" + encodeURIComponent(folder.id) : "")
      : query.trim() ? "/api/o365/files/search?q=" + encodeURIComponent(query.trim()) : "/api/o365/files/recent";
    api.get<{ configured?: boolean; url?: string; items?: DriveItem[]; files?: DriveItem[] }>(path)
      .then((r) => { if (!alive) return; setConfigured(tab !== "library" || r?.configured !== false); setLibUrl(r?.url ?? null); setItems((r?.items ?? r?.files ?? []) as DriveItem[]); })
      .catch((e: any) => { if (alive) { setItems([]); setError(e?.status === 412 ? "Connect Microsoft 365 in Settings first." : "Could not load files."); } })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [open, tab, folder.id, query, reload]);

  if (!open) return null;
  const createLibrary = async () => {
    setBusy(true); setError(null);
    try { await api.post("/api/o365/library/ensure", {}); setStack([{ id: null, name: "Staff Library" }]); setConfigured(true); setReload((n) => n + 1); }
    catch (e: any) { setError(e?.status === 412 ? "Connect Microsoft 365 in Settings first." : "Could not create the Staff Library."); }
    finally { setBusy(false); }
  };
  const pick = async (f: DriveItem) => {
    if (f.isFolder) { if (tab === "library") setStack((s) => [...s, { id: f.id, name: f.name }]); return; }
    if (tab === "library") { if (f.webUrl) onPick({ name: f.name, url: f.webUrl }); return; }
    try { const r = await api.post<{ link?: string | null }>("/api/o365/files/" + encodeURIComponent(f.id) + "/link", {}); const url = r?.link ?? f.webUrl; if (url) onPick({ name: f.name, url }); }
    catch { setError("Could not make a company link for that file."); }
  };
  const btn = (on: boolean) => ({ padding: "6px 12px", borderRadius: 6, border: "1px solid #0B1F3A", background: on ? "#0B1F3A" : "#fff", color: on ? "#fff" : "#0B1F3A", fontWeight: 600, cursor: "pointer" } as const);
  return (
    <div role="dialog" aria-label="Share a file" data-testid="share-file-modal" style={{ position: "fixed", inset: 0, background: "rgba(11,31,58,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 94vw)", maxHeight: "80vh", overflow: "auto", background: "#fff", color: "#0B1F3A", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong style={{ flex: 1 }}>Share a file</strong>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>{"×"}</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={btn(tab === "library")} onClick={() => setTab("library")}>Staff Library</button>
          <button type="button" style={btn(tab === "mine")} onClick={() => setTab("mine")}>My OneDrive</button>
        </div>
        {tab === "library" && configured && <div style={{ fontSize: 13, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {stack.map((s, i) => <span key={i}>{i > 0 && " › "}<button type="button" onClick={() => setStack((st) => st.slice(0, i + 1))} style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", padding: 0 }}>{s.name}</button></span>)}
          {libUrl && <a href={libUrl} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: 12 }}>Open in OneDrive (to upload)</a>}
        </div>}
        {tab === "mine" && <input aria-label="Search my OneDrive" placeholder="Search my OneDrive" value={query} onChange={(e) => setQuery(e.target.value)} style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6 }} />}
        {tab === "library" && !configured && <div data-testid="library-missing" style={{ fontSize: 13 }}>
          The Staff Library has not been created yet. It is a OneDrive folder shared with everyone at Boreal, with "Lender Forms" and "Read This" folders.
          <div style={{ marginTop: 8 }}><button type="button" style={btn(true)} disabled={busy} onClick={() => void createLibrary()}>Create the Staff Library</button></div>
        </div>}
        {error && <div role="alert" style={{ color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>}
        {busy && <div style={{ fontSize: 13, color: "#51617D" }}>Loading...</div>}
        {!busy && configured && items.length === 0 && !error && <div style={{ fontSize: 13, color: "#51617D" }}>No files here yet.</div>}
        <div style={{ display: "grid" }}>
          {items.map((f) => (
            <button key={f.id} type="button" data-testid="share-file-item" onClick={() => void pick(f)} style={{ textAlign: "left", padding: "8px 6px", border: "none", borderTop: "1px solid #E4EAF2", background: "transparent", color: "#0B1F3A", cursor: "pointer", fontSize: 14 }}>
              {f.isFolder ? "\u{1F4C1} " : "\u{1F4C4} "}{f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
