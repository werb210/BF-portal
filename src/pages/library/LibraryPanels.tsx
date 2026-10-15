// BF_PORTAL_v810_LIBRARY_PLUS - the Staff Library's preview panel and dialogs: share link, send to client, version
// history, move to a folder, and file requests (upload links).
import { useEffect, useState, type ReactNode } from "react";
import * as L from "./libraryApi";
import type { Client, Item, Preview } from "./libraryApi";

export const btn = { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontWeight: 600, cursor: "pointer" } as const;
export const primary = { ...btn, background: "#0B1F3A", color: "#fff", border: "1px solid #0B1F3A" } as const;
export const small = { ...btn, padding: "4px 10px", fontSize: 12 } as const;
const input = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 14 } as const;
const label = { display: "block", fontSize: 13, fontWeight: 600, margin: "10px 0 4px" } as const;
const errText = (e: any, dflt: string) => String(e?.details?.message ?? e?.message ?? dflt);

export function humanDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function Modal({ title, onClose, children, testId }: { title: string; onClose: () => void; children: ReactNode; testId?: string }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} data-testid={testId}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--ui-surface-strong, #fff)", color: "var(--ui-text)", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 17, margin: 0, flex: 1 }}>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: "none", border: 0, fontSize: 22, cursor: "pointer", color: "var(--ui-text)" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CopyBox({ url, note }: { url: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div data-testid="library-link-box" style={{ marginTop: 12 }}>
      <input readOnly value={url} style={input} onFocus={(e) => e.currentTarget.select()} data-testid="library-link" />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <button type="button" style={primary} onClick={() => { void navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? "Copied" : "Copy link"}</button>
        {note && <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{note}</span>}
      </div>
    </div>
  );
}

// ---- preview ---------------------------------------------------------------------------------------------------
export function PreviewPanel({ item, onClose }: { item: Item; onClose: () => void }) {
  const [p, setP] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setP(null); setErr(null);
    L.preview(item.id).then((r) => { if (live) setP(r); }).catch((e) => { if (live) setErr(errText(e, "This file can't be previewed.")); });
    return () => { live = false; };
  }, [item.id]);
  return (
    <aside data-testid="library-preview" aria-label={"Preview of " + item.name}
      style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(720px, 100vw)", background: "var(--ui-surface-strong, #fff)", color: "var(--ui-text)", boxShadow: "-8px 0 30px rgba(0,0,0,0.2)", zIndex: 1250, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--ui-border)" }}>
        <strong style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</strong>
        {(p?.downloadUrl || p?.webUrl || item.webUrl) && <a href={p?.downloadUrl ?? p?.webUrl ?? item.webUrl ?? "#"} target="_blank" rel="noreferrer" style={{ ...small, textDecoration: "none" }}>{p?.downloadUrl ? "Download" : "Open in OneDrive"}</a>}
        <button type="button" aria-label="Close preview" onClick={onClose} style={{ background: "none", border: 0, fontSize: 22, cursor: "pointer", color: "var(--ui-text)" }}>×</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {err && <div role="alert" style={{ padding: 20, color: "#991b1b" }}>{err}</div>}
        {!err && !p && <div style={{ color: "#334155" }}>Loading preview...</div>}
        {p?.kind === "image" && p.downloadUrl && <img src={p.downloadUrl} alt={item.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
        {p?.kind === "video" && (p.downloadUrl || p.embedUrl) && (p.downloadUrl ? <video src={p.downloadUrl} controls style={{ maxWidth: "100%", maxHeight: "100%" }} /> : <iframe title={item.name} src={p.embedUrl ?? ""} style={{ border: 0, width: "100%", height: "100%" }} />)}
        {(p?.kind === "pdf" || p?.kind === "office") && (p.embedUrl
          ? <iframe title={item.name} src={p.embedUrl} style={{ border: 0, width: "100%", height: "100%", background: "#fff" }} />
          : <div style={{ padding: 20, color: "#334155" }}>No preview for this file. Use Download.</div>)}
      </div>
    </aside>
  );
}

// ---- share link for people outside Boreal ----------------------------------------------------------------------
export function ShareDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const [days, setDays] = useState(7);
  const [password, setPassword] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const make = async () => {
    setBusy(true); setErr(null);
    try { setUrl((await L.shareLink(item.id, { expiresDays: days, password, allowDownload })).url ?? null); }
    catch (e) { setErr(errText(e, "Could not make the link.")); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={"Share " + item.name} onClose={onClose} testId="library-share-dialog">
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: 0 }}>A link for someone outside Boreal, like a client or a lender. They don't need an account.</p>
      <label style={label} htmlFor="ls-days">Link works for</label>
      <select id="ls-days" value={days} onChange={(e) => setDays(Number(e.target.value))} style={input} disabled={!!url}>
        {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d === 1 ? "1 day" : d + " days"}</option>)}
      </select>
      <label style={label} htmlFor="ls-pw">Password (optional)</label>
      <input id="ls-pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} style={input} disabled={!!url} placeholder="Leave blank for no password" autoComplete="off" />
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 14 }}>
        <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} disabled={!!url} data-testid="ls-download" /> Let them download it (otherwise view only)
      </label>
      {err && <p role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{err}</p>}
      {url ? <CopyBox url={url} note={password ? "Send the password separately." : undefined} />
        : <div style={{ marginTop: 14 }}><button type="button" style={primary} disabled={busy} onClick={() => void make()} data-testid="ls-create">{busy ? "Making link..." : "Make link"}</button></div>}
    </Modal>
  );
}

// ---- send to client --------------------------------------------------------------------------------------------
export function SendDialog({ item, onClose, onSent }: { item: Item; onClose: () => void; onSent: (text: string) => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Client[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [how, setHow] = useState<"portal" | "email" | "text">("portal");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (client || q.trim().length < 2) { setFound([]); return; }
    let live = true;
    const t = setTimeout(() => { L.clients(q.trim()).then((r) => { if (live) setFound(r?.items ?? []); }).catch(() => { if (live) setFound([]); }); }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q, client]);
  const send = async () => {
    if (!client) return;
    setBusy(true); setErr(null);
    try {
      const way = await L.sendToClient(item, client, how, note);
      onSent((how === "portal" ? "Sent to " + client.name + "'s client portal" : how === "email" ? "Emailed to " + client.name : "Texted to " + client.name) + (way === "link" ? " as a 7-day link." : "."));
    } catch (e) { setErr(errText(e, "Could not send it.")); }
    finally { setBusy(false); }
  };
  const big = item.size != null && item.size > 3 * 1024 * 1024;
  return (
    <Modal title={"Send " + item.name} onClose={onClose} testId="library-send-dialog">
      <label style={label} htmlFor="sd-q">Client</label>
      {client
        ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}><strong data-testid="sd-picked">{client.name}</strong><span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{client.email ?? ""} {client.phone ?? ""}</span><button type="button" style={small} onClick={() => setClient(null)}>Change</button></div>
        : <>
          <input id="sd-q" value={q} onChange={(e) => setQ(e.target.value)} style={input} placeholder="Name, email, phone or business" autoComplete="off" />
          {found.length > 0 && <div role="listbox" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, marginTop: 4 }}>
            {found.map((c) => <button key={c.id} type="button" role="option" aria-selected={false} onClick={() => setClient(c)} data-testid="sd-option"
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: 0, borderTop: "1px solid var(--ui-border)", color: "var(--ui-text)", cursor: "pointer" }}>
              <strong>{c.name}</strong> <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.email ?? ""} {c.phone ?? ""}</span></button>)}
          </div>}
        </>}
      <div role="radiogroup" aria-label="How to send" style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap", fontSize: 14 }}>
        {([["portal", "Client portal"], ["email", "Email"], ["text", "Text a link"]] as const).map(([k, t]) => (
          <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="radio" name="sd-how" checked={how === k} onChange={() => setHow(k)} data-testid={"sd-how-" + k} /> {t}</label>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--ui-text-muted)", margin: "6px 0 0" }}>
        {how === "text" || big ? "They get a download link that works for 7 days." : "The file is attached (3 MB or less)."}
        {how === "portal" ? " It appears in their client portal chat and documents." : ""}
      </p>
      <label style={label} htmlFor="sd-note">Message</label>
      <textarea id="sd-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} placeholder={"Here is " + item.name + " from Boreal Financial."} />
      {err && <p role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{err}</p>}
      <div style={{ marginTop: 14 }}><button type="button" style={primary} disabled={!client || busy} onClick={() => void send()} data-testid="sd-send">{busy ? "Sending..." : "Send"}</button></div>
    </Modal>
  );
}

// ---- version history -------------------------------------------------------------------------------------------
export function VersionsDialog({ item, onClose, onRestored }: { item: Item; onClose: () => void; onRestored: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { L.versions(item.id).then((r) => setRows(r?.versions ?? [])).catch((e) => setErr(errText(e, "Could not load the versions."))); }, [item.id]);
  const back = async (vid: string) => {
    setBusy(vid);
    try { await L.restoreVersion(item.id, vid); onRestored(); } catch (e) { setErr(errText(e, "Could not restore that version.")); } finally { setBusy(null); }
  };
  return (
    <Modal title={"Versions of " + item.name} onClose={onClose} testId="library-versions">
      {err && <p role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{err}</p>}
      {!rows && !err && <p>Loading...</p>}
      {rows && rows.length === 0 && <p>No earlier versions.</p>}
      {rows && rows.map((v, i) => (
        <div key={v.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--ui-border)" }}>
          <div style={{ flex: 1 }}><strong>{i === 0 ? "Current" : "Version " + v.id}</strong><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{humanDate(v.lastModified)}{v.modifiedBy ? " · " + v.modifiedBy : ""}</div></div>
          {i > 0 && <button type="button" style={small} disabled={!!busy} onClick={() => void back(v.id)}>{busy === v.id ? "Restoring..." : "Restore"}</button>}
        </div>
      ))}
    </Modal>
  );
}

// ---- move to a folder ------------------------------------------------------------------------------------------
export function MoveDialog({ item, onClose, onMoved }: { item: Item; onClose: () => void; onMoved: (to: string) => void }) {
  const [path, setPath] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: "Staff Library" }]);
  const [folders, setFolders] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const here = path[path.length - 1]!;
  useEffect(() => {
    let live = true;
    setFolders(null);
    L.listFolder(here.id).then((r) => { if (live) setFolders((r?.items ?? []).filter((i) => i.isFolder && i.id !== item.id)); }).catch((e) => { if (live) setErr(errText(e, "Could not load folders.")); });
    return () => { live = false; };
  }, [here.id, item.id]);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await L.move(item.id, here.id); onMoved(here.name); } catch (e) { setErr(errText(e, "Could not move it.")); } finally { setBusy(false); }
  };
  return (
    <Modal title={"Move " + item.name} onClose={onClose} testId="library-move">
      <div style={{ fontSize: 13, marginBottom: 8 }}>{path.map((s, i) => <span key={i}>{i > 0 && " › "}<button type="button" onClick={() => setPath((p) => p.slice(0, i + 1))} style={{ background: "none", border: 0, padding: 0, color: "#1d4ed8", cursor: "pointer", fontWeight: i === path.length - 1 ? 700 : 400 }}>{s.name}</button></span>)}</div>
      {!folders && !err && <p>Loading...</p>}
      {folders && folders.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No folders inside.</p>}
      {folders && folders.map((f) => <button key={f.id} type="button" onClick={() => setPath((p) => [...p, { id: f.id, name: f.name }])} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 6px", background: "none", border: 0, borderTop: "1px solid var(--ui-border)", color: "var(--ui-text)", cursor: "pointer" }}>{"\u{1F4C1} " + f.name}</button>)}
      {err && <p role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{err}</p>}
      <div style={{ marginTop: 14 }}><button type="button" style={primary} disabled={busy} onClick={() => void go()} data-testid="mv-here">{busy ? "Moving..." : "Move here"}</button></div>
    </Modal>
  );
}

// ---- file request (upload link) ----------------------------------------------------------------------------------
export function RequestDialog({ folder, onClose }: { folder: { id: string | null; name: string }; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const make = async () => {
    if (!title.trim()) { setErr("Say what you're asking for."); return; }
    setBusy(true); setErr(null);
    try { setUrl((await L.fileRequest({ folderId: folder.id, title: title.trim(), expiresDays: days })).url ?? null); }
    catch (e) { setErr(errText(e, "Could not make the upload link.")); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={"Request files into " + folder.name} onClose={onClose} testId="library-request-dialog">
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: 0 }}>Anyone with the link can upload files into this folder. They can't see what's already there. You get a notification for each file.</p>
      <label style={label} htmlFor="rq-title">What are you asking for?</label>
      <input id="rq-title" value={title} onChange={(e) => setTitle(e.target.value)} style={input} placeholder="e.g. Signed lender agreement" disabled={!!url} />
      <label style={label} htmlFor="rq-days">Link works for</label>
      <select id="rq-days" value={days} onChange={(e) => setDays(Number(e.target.value))} style={input} disabled={!!url}>
        {[7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
      </select>
      {err && <p role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{err}</p>}
      {url ? <CopyBox url={url} /> : <div style={{ marginTop: 14 }}><button type="button" style={primary} disabled={busy} onClick={() => void make()} data-testid="rq-create">{busy ? "Making link..." : "Make upload link"}</button></div>}
    </Modal>
  );
}

// ---- how to sync it like Dropbox --------------------------------------------------------------------------------
export function SyncHelp({ libUrl, onClose }: { libUrl: string | null; onClose: () => void }) {
  return (
    <Modal title="Use the library like Dropbox" onClose={onClose} testId="library-sync-help">
      <p style={{ marginTop: 0 }}>The Staff Library is a OneDrive folder, so the OneDrive app can keep a copy on your Mac or iPad.</p>
      <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
        <li>Install OneDrive on your Mac (App Store) or iPad, and sign in with your Boreal Microsoft account.</li>
        <li>{libUrl ? <a href={libUrl} target="_blank" rel="noreferrer">Open the library in OneDrive</a> : "Open the library in OneDrive"} in a browser.</li>
        <li>Click <strong>Add shortcut to My files</strong> at the top.</li>
        <li>On a Mac it now appears in Finder under OneDrive, and changes sync both ways. On iPad it's in the Files app under OneDrive.</li>
      </ol>
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Files you delete in Finder skip this page's recycle bin and go to OneDrive's own recycle bin.</p>
    </Modal>
  );
}
