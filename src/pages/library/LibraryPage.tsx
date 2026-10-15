// BF_PORTAL_LIBRARY_PAGE_v762 - the Staff Library: one OneDrive folder shared with everyone at Boreal (lender forms,
// things staff must read). Browse folders, upload, open, copy a company link, or share a file in Team chat.
// BF_PORTAL_v810_LIBRARY_PLUS - Dropbox-style: drag and drop files and folders, preview, rename / move / delete with a
// 30-day recycle bin, search, thumbnails and who changed what, sort and grid view, Recent, Starred, version history,
// share links for people outside Boreal, Send to client, upload links (file requests), Activity, folder zip download.
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { withO365Scopes } from "@/api/o365Interceptor"; // BF_PORTAL_v789_INCREMENTAL_CONSENT - Files.ReadWrite on use
import { FILES_READWRITE_SCOPES } from "@/auth/o365Scopes";
import * as L from "./libraryApi";
import type { Item } from "./libraryApi";
import { btn, primary, small, humanDate, MoveDialog, PreviewPanel, RequestDialog, SendDialog, ShareDialog, SyncHelp, VersionsDialog } from "./LibraryPanels";

// BF_PORTAL_LIBRARY_BIG_UPLOAD_v772 - up to 200 MB, sent to OneDrive in pieces through BF-Server v790.
const MAX_BYTES = 200 * 1024 * 1024;

export const teamShareLink = (name: string, url: string) =>
  "/communications?tab=team&share=" + encodeURIComponent(url) + "&name=" + encodeURIComponent(name);

export function humanSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// BF_PORTAL_LIBRARY_BIG_UPLOAD_v772 - open a OneDrive upload session, then send the file in the pieces the server
// asks for (5 MB). Each piece is a normal request, so a 200 MB file never sits in memory as one body.
export async function uploadInPieces(file: File, folderId: string | null, onProgress?: (pct: number) => void): Promise<void> {
  const s = await withO365Scopes(FILES_READWRITE_SCOPES, () => api.post<{ uploadUrl?: string; chunkBytes?: number }>("/api/o365/library/upload-session", { name: file.name, folderId, size: file.size }), { interactive: true });
  const uploadUrl = String(s?.uploadUrl ?? "");
  const step = Number(s?.chunkBytes) > 0 ? Number(s.chunkBytes) : 5 * 1024 * 1024;
  if (!uploadUrl) throw new Error("OneDrive did not open an upload");
  for (let start = 0; start < file.size; start += step) {
    const end = Math.min(start + step, file.size);
    const r = await api.post<{ done?: boolean }>("/api/o365/library/upload-chunk", file.slice(start, end), {
      headers: { "Content-Type": "application/octet-stream", "x-upload-url": uploadUrl, "x-chunk-start": String(start), "x-total-size": String(file.size) },
    });
    onProgress?.(Math.round((end / file.size) * 100));
    if (r?.done) return;
  }
}

// BF_PORTAL_v810_LIBRARY_PLUS - a file with the folder path it came from (dragged or chosen folders).
export type Upload = { file: File; dir: string };
// Everything inside the dropped items, folders included (Chrome, Safari and Edge support webkitGetAsEntry).
export async function filesFromDrop(dt: DataTransfer): Promise<Upload[]> {
  const out: Upload[] = [];
  const entries = Array.from(dt.items ?? []).map((i) => (i as any).webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return Array.from(dt.files ?? []).map((file) => ({ file, dir: "" }));
  const walk = async (entry: any, dir: string): Promise<void> => {
    if (entry.isFile) { out.push({ file: await new Promise<File>((res, rej) => entry.file(res, rej)), dir }); return; }
    if (!entry.isDirectory) return;
    const reader = entry.createReader();
    const sub = dir ? dir + "/" + entry.name : entry.name;
    for (;;) {
      const batch: any[] = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await walk(e, sub);
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}

type View = "files" | "recent" | "starred" | "shared" | "requests" | "activity" | "trash";
const VIEWS: Array<[View, string]> = [["files", "Files"], ["recent", "Recent"], ["starred", "Starred"], ["shared", "Shared links"], ["requests", "File requests"], ["activity", "Activity"], ["trash", "Recycle bin"]];
const ACTIONS: Record<string, string> = {
  uploaded: "uploaded", created_folder: "made the folder", renamed: "renamed", moved: "moved", deleted: "deleted", restored: "restored",
  opened: "opened", shared_link: "made a share link for", requested_files: "asked for files into", received_upload: "uploaded",
  restored_version: "restored an earlier version of", sent_to_client: "sent", downloaded_zip: "downloaded as a zip",
};
const DRAG_TYPE = "application/x-boreal-library-item";

function fileIcon(it: Item): string {
  if (it.isFolder) return "\u{1F4C1}";
  const m = String(it.mimeType ?? "");
  if (m.startsWith("image/")) return "\u{1F5BC}️";
  if (m === "application/pdf") return "\u{1F4D5}";
  if (m.includes("sheet") || m.includes("excel") || /\.(xlsx?|csv)$/i.test(it.name)) return "\u{1F4CA}";
  if (m.includes("word") || /\.docx?$/i.test(it.name)) return "\u{1F4DD}";
  if (m.startsWith("video/")) return "\u{1F3AC}";
  if (/\.(zip|rar|7z)$/i.test(it.name)) return "\u{1F5DC}️";
  return "\u{1F4C4}";
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const [stack, setStack] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: "Staff Library" }]);
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "not_connected" | "error">("loading");
  const [libUrl, setLibUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("files");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[] | null>(null);
  const [sort, setSort] = useState<"name" | "date" | "size">("name");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<Item | null>(null);
  const [sharing, setSharing] = useState<Item | null>(null);
  const [sending, setSending] = useState<Item | null>(null);
  const [versionsOf, setVersionsOf] = useState<Item | null>(null);
  const [moving, setMoving] = useState<Item | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [syncHelp, setSyncHelp] = useState(false);
  const [other, setOther] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const folder = stack[stack.length - 1] ?? { id: null, name: "Staff Library" };

  const load = useCallback(async () => {
    setState("loading");
    try {
      const r = await withO365Scopes(FILES_READWRITE_SCOPES, () => api.get<{ configured?: boolean; url?: string; items?: Item[] }>("/api/o365/library" + (folder.id ? "?item=" + encodeURIComponent(folder.id) : "")));
      if (r?.configured === false) { setState("missing"); return; }
      setLibUrl(r?.url ?? null); setItems(r?.items ?? []); setState("ready");
    } catch (e: any) {
      setState(e?.status === 412 ? "not_connected" : "error");
    }
  }, [folder.id]);
  useEffect(() => { void load(); }, [load]);

  const loadStars = useCallback(async () => {
    try { const r = await L.stars(); setStarred(new Set((r?.items ?? []).map((s: any) => String(s.item_id)).filter((x) => x && x !== "undefined"))); }
    catch { /* stars are a convenience; the library works without them */ }
  }, []);
  useEffect(() => { void loadStars(); }, [loadStars]);

  // Search across the whole library (names and the text inside PDFs and Office files).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return; }
    let live = true;
    const t = setTimeout(() => {
      L.search(term).then((r) => { if (live) setResults(r?.items ?? []); }).catch(() => { if (live) setResults([]); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  // The other views load when they are opened.
  const loadOther = useCallback(async (v: View) => {
    setOther(null);
    try {
      const r: any = v === "recent" ? await L.recent() : v === "starred" ? await L.stars() : v === "shared" ? await L.shareLinks()
        : v === "requests" ? await L.fileRequests() : v === "activity" ? await L.activity() : v === "trash" ? await L.trash() : { items: [] };
      setOther(r?.items ?? []);
    } catch { setOther([]); setNotice({ ok: false, text: "Could not load that list." }); }
  }, []);
  useEffect(() => { if (view !== "files") void loadOther(view); }, [view, loadOther]);
  useEffect(() => { if (!menuFor) return; const close = () => setMenuFor(null); window.addEventListener("click", close); return () => window.removeEventListener("click", close); }, [menuFor]);

  const create = async () => {
    setBusy(true);
    try { await withO365Scopes(FILES_READWRITE_SCOPES, () => api.post("/api/o365/library/ensure", {}), { interactive: true }); await load(); }
    catch (e: any) { setNotice({ ok: false, text: e?.status === 412 ? "Connect Microsoft 365 in Settings first." : "Could not create the Staff Library." }); }
    finally { setBusy(false); }
  };

  // BF_PORTAL_v810_LIBRARY_PLUS - uploads keep the folders they came from (dragged or chosen folders).
  const folderCache = useRef(new Map<string, string | null>());
  const folderFor = async (dir: string): Promise<string | null> => {
    if (!dir) return folder.id;
    const key = (folder.id ?? "") + "|" + dir;
    if (folderCache.current.has(key)) return folderCache.current.get(key) ?? null;
    const slash = dir.lastIndexOf("/");
    const parent = await folderFor(slash === -1 ? "" : dir.slice(0, slash));
    const r = await withO365Scopes(FILES_READWRITE_SCOPES, () => api.post<{ item?: Item }>("/api/o365/library/folder", { name: dir.slice(slash + 1), folderId: parent }), { interactive: true });
    const id = r?.item?.id ?? null;
    folderCache.current.set(key, id);
    return id;
  };
  const uploadAll = async (list: Upload[]) => {
    if (!list.length) return;
    setBusy(true); setNotice(null);
    folderCache.current.clear();
    let done = 0; const failed: string[] = [];
    for (const { file: f, dir } of list) {
      if (f.size > MAX_BYTES) { failed.push(f.name + " (over 200 MB - upload it in OneDrive)"); continue; }
      if (f.size === 0) { failed.push(f.name + " (empty file)"); continue; }
      try {
        setNotice({ ok: true, text: "Uploading " + f.name + "..." });
        const target = await folderFor(dir);
        await uploadInPieces(f, target, (pct) => setNotice({ ok: true, text: "Uploading " + f.name + "... " + pct + "%" }));
        done++;
      } catch (e: any) { const why = e?.details?.message || e?.details?.detail || e?.message; failed.push(f.name + (why ? " (" + String(why).slice(0, 160) + ")" : "")); } // BF_PORTAL_LIBRARY_ERROR_REASON_v773 - always say why
    }
    setNotice(failed.length ? { ok: false, text: (done ? "Uploaded " + done + ". " : "") + "Not uploaded: " + failed.join(", ") } : { ok: true, text: "Uploaded " + done + (done === 1 ? " file." : " files.") });
    setBusy(false); void load();
  };
  const upload = (files: FileList | null) => uploadAll(Array.from(files ?? []).map((file) => ({ file, dir: "" })));
  const uploadFolder = (files: FileList | null) => uploadAll(Array.from(files ?? []).map((file) => {
    const rel = String((file as any).webkitRelativePath ?? "");
    return { file, dir: rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "" };
  }));

  const newFolder = async () => {
    const name = window.prompt("Folder name");
    if (!name || !name.trim()) return;
    setBusy(true);
    try { await withO365Scopes(FILES_READWRITE_SCOPES, () => api.post("/api/o365/library/folder", { name: name.trim(), folderId: folder.id }), { interactive: true }); setNotice({ ok: true, text: "Folder created." }); await load(); }
    catch { setNotice({ ok: false, text: "Could not create the folder." }); }
    finally { setBusy(false); }
  };

  const copy = async (it: Item) => {
    if (!it.webUrl) return;
    try { await navigator.clipboard.writeText(it.webUrl); setNotice({ ok: true, text: "Link copied: " + it.name }); }
    catch { window.prompt("Copy this link", it.webUrl); }
  };

  const act = async (what: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setNotice(null);
    try { await fn(); setNotice({ ok: true, text: ok }); await load(); if (view !== "files") await loadOther(view); }
    catch (e: any) { setNotice({ ok: false, text: String(e?.details?.message ?? e?.message ?? "Could not " + what + ".") }); }
    finally { setBusy(false); }
  };
  const doRename = (it: Item) => {
    const name = window.prompt("New name", it.name);
    if (!name || !name.trim() || name.trim() === it.name) return;
    void act("rename it", () => L.rename(it.id, name.trim()), "Renamed to " + name.trim() + ".");
  };
  const doDelete = (it: Item) => {
    if (!window.confirm("Delete " + it.name + "? You can restore it from the Recycle bin for 30 days.")) return;
    void act("delete it", () => L.remove(it.id), it.name + " is in the Recycle bin for 30 days.");
  };
  const toggleStar = async (it: Item) => {
    const on = !starred.has(it.id);
    setStarred((s) => { const n = new Set(s); if (on) n.add(it.id); else n.delete(it.id); return n; });
    try { await L.setStar(it, on); } catch { setNotice({ ok: false, text: "Could not save the star." }); void loadStars(); }
  };
  const zip = (id: string | null, name: string) => void act("download the zip", () => L.downloadZip(id, name), "Downloading " + name + ".zip");

  // Drag a file or folder onto a folder (or a breadcrumb) to move it there.
  const onRowDragStart = (e: DragEvent, it: Item) => { e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: it.id, name: it.name })); e.dataTransfer.effectAllowed = "move"; };
  const dropTarget = (targetId: string | null, targetName: string) => ({
    onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.stopPropagation(); setDropOn(targetId ?? "root"); } },
    onDragLeave: () => setDropOn(null),
    onDrop: (e: DragEvent) => {
      const raw = e.dataTransfer.getData(DRAG_TYPE);
      if (!raw) return;
      e.preventDefault(); e.stopPropagation(); setDropOn(null); setDragging(false);
      const moved = JSON.parse(raw) as { id: string; name: string };
      if (moved.id === targetId) return;
      void act("move it", () => L.move(moved.id, targetId), "Moved " + moved.name + " to " + targetName + ".");
    },
  });
  // Files and folders dragged in from the computer upload into the open folder.
  const pageDrop = {
    onDragOver: (e: DragEvent) => { if (Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); setDragging(true); } },
    onDragLeave: (e: DragEvent) => { if (e.currentTarget === e.target) setDragging(false); },
    onDrop: async (e: DragEvent) => {
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault(); setDragging(false);
      if (view !== "files" || results) { setNotice({ ok: false, text: "Open a folder in Files, then drop files there." }); return; }
      await uploadAll(await filesFromDrop(e.dataTransfer));
    },
  };

  const shown = useMemo(() => {
    const list = [...(results ?? items)];
    const cmp = (a: Item, b: Item) => sort === "date" ? String(b.lastModified ?? "").localeCompare(String(a.lastModified ?? ""))
      : sort === "size" ? Number(b.size ?? 0) - Number(a.size ?? 0) : a.name.localeCompare(b.name);
    return list.sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || Number(starred.has(b.id)) - Number(starred.has(a.id)) || cmp(a, b));
  }, [results, items, sort, starred]);

  const openItem = (it: Item) => { if (it.isFolder) { setQ(""); setResults(null); setStack((s) => [...s, { id: it.id, name: it.name }]); } else setPreviewing(it); };

  const menu = (it: Item) => (
    <div role="menu" onClick={(e) => e.stopPropagation()} data-testid="library-menu"
      style={{ position: "absolute", right: 0, top: "100%", zIndex: 30, minWidth: 210, background: "var(--ui-surface-strong, #fff)", border: "1px solid var(--ui-border)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", padding: 4, textAlign: "left" }}>
      {([
        !it.isFolder && ["Preview", () => setPreviewing(it)],
        it.isFolder && ["Open", () => openItem(it)],
        ["Rename", () => doRename(it)],
        ["Move to...", () => setMoving(it)],
        [starred.has(it.id) ? "Remove star" : "Star", () => void toggleStar(it)],
        !it.isFolder && ["Share link (outside Boreal)...", () => setSharing(it)],
        !it.isFolder && ["Send to client...", () => setSending(it)],
        !it.isFolder && ["Version history", () => setVersionsOf(it)],
        it.isFolder && ["Download as zip", () => zip(it.id, it.name)],
        it.isFolder && ["Request files into this folder...", () => { setStack((s) => [...s, { id: it.id, name: it.name }]); setRequesting(true); }],
        it.webUrl && ["Copy company link", () => void copy(it)],
        ["Delete", () => doDelete(it)],
      ].filter(Boolean) as Array<[string, () => void]>).map(([t, fn]) => (
        <button key={t} type="button" role="menuitem" onClick={() => { setMenuFor(null); fn(); }}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: 0, borderRadius: 6, color: t === "Delete" ? "#991b1b" : "var(--ui-text)", cursor: "pointer", fontSize: 14 }}>{t}</button>
      ))}
    </div>
  );
  const star = (it: Item) => (
    <button type="button" aria-label={(starred.has(it.id) ? "Remove star from " : "Star ") + it.name} aria-pressed={starred.has(it.id)} onClick={(e) => { e.stopPropagation(); void toggleStar(it); }}
      style={{ background: "none", border: 0, cursor: "pointer", fontSize: 16, color: starred.has(it.id) ? "#b45309" : "var(--ui-text-muted)", padding: 2 }}>{starred.has(it.id) ? "★" : "☆"}</button>
  );
  const more = (it: Item) => (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button type="button" aria-label={"More actions for " + it.name} aria-haspopup="menu" aria-expanded={menuFor === it.id} data-testid="library-more"
        onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === it.id ? null : it.id); }} style={{ ...small, padding: "4px 9px" }}>{"⋯"}</button>
      {menuFor === it.id && menu(it)}
    </span>
  );
  const nameCell = (it: Item) => (
    <button type="button" onClick={() => openItem(it)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ui-text)", fontWeight: it.isFolder ? 600 : 400, display: "inline-flex", alignItems: "center", gap: 8, textAlign: "left" }}>
      {it.thumbnailUrl && !it.isFolder ? <img src={it.thumbnailUrl} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }} /> : <span aria-hidden="true">{fileIcon(it)}</span>}
      <span>{it.name}</span>
    </button>
  );

  const listView = (
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr style={{ fontSize: 12, color: "var(--ui-text-muted)", textAlign: "left" }}><th style={{ padding: "4px 6px", width: 24 }} /><th style={{ padding: "4px 6px" }}>Name</th><th style={{ padding: "4px 6px" }}>Size</th><th style={{ padding: "4px 6px" }}>Modified</th><th /></tr></thead>
      <tbody>
        {shown.map((it) => (
          <tr key={it.id} data-testid="library-row" draggable onDragStart={(e) => onRowDragStart(e, it)} {...(it.isFolder ? dropTarget(it.id, it.name) : {})}
            style={{ borderTop: "1px solid var(--ui-border)", background: dropOn === it.id ? "rgba(29,78,216,0.12)" : undefined }}>
            <td style={{ padding: "8px 6px" }}>{star(it)}</td>
            <td style={{ padding: "8px 6px" }}>{nameCell(it)}</td>
            <td style={{ padding: "8px 6px", fontSize: 12, color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{it.isFolder ? (it.childCount != null ? it.childCount + (it.childCount === 1 ? " item" : " items") : "") : humanSize(it.size)}</td>
            <td style={{ padding: "8px 6px", fontSize: 12, color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{it.lastModified ? new Date(it.lastModified).toLocaleDateString("en-CA") : ""}{it.modifiedBy ? " · " + it.modifiedBy : ""}</td>
            <td style={{ padding: "8px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
              {!it.isFolder && it.webUrl && <button type="button" data-testid="library-share" style={{ ...small, marginRight: 6 }} onClick={() => navigate(teamShareLink(it.name, it.webUrl as string))}>Share in Team chat</button>}
              {more(it)}
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
  const gridView = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
      {shown.map((it) => (
        <div key={it.id} data-testid="library-card" draggable onDragStart={(e) => onRowDragStart(e, it)} {...(it.isFolder ? dropTarget(it.id, it.name) : {})}
          style={{ border: "1px solid var(--ui-border)", borderRadius: 10, padding: 10, background: dropOn === it.id ? "rgba(29,78,216,0.12)" : "var(--ui-surface-strong)", position: "relative" }}>
          <button type="button" onClick={() => openItem(it)} style={{ display: "block", width: "100%", height: 100, border: 0, borderRadius: 8, background: "var(--ui-surface-muted)", cursor: "pointer", padding: 0, overflow: "hidden" }} aria-label={"Open " + it.name}>
            {it.thumbnailUrl && !it.isFolder ? <img src={it.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 40 }} aria-hidden="true">{fileIcon(it)}</span>}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
            {star(it)}<span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.name}>{it.name}</span>{more(it)}
          </div>
          <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{it.isFolder ? "" : humanSize(it.size)}{it.lastModified ? " · " + new Date(it.lastModified).toLocaleDateString("en-CA") : ""}</div>
        </div>
      ))}
    </div>
  );

  const asItem = (r: any): Item => ({ id: String(r.item_id), name: String(r.item_name), isFolder: r.is_folder === true, webUrl: null, size: null, lastModified: r.created_at ?? null });
  const otherView = () => {
    if (!other) return <div style={{ color: "var(--ui-text-muted)" }}>Loading...</div>;
    if (!other.length) return <div style={{ color: "var(--ui-text-muted)" }} data-testid="library-empty">{
      view === "recent" ? "Nothing yet. Files you and the team open or change show here." : view === "starred" ? "No stars yet. Tap the star next to a file to pin it here." :
      view === "shared" ? "No active share links." : view === "requests" ? "No open upload links." : view === "trash" ? "The recycle bin is empty." : "No activity yet."}</div>;
    const row = (key: string, main: ReactNode, sub: ReactNode, actions?: ReactNode) => (
      <div key={key} data-testid="library-other-row" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 6px", borderTop: "1px solid var(--ui-border)" }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{main}</div><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{sub}</div></div>
        {actions}
      </div>
    );
    return other.map((r: any) => {
      if (view === "recent" || view === "starred") {
        const it = asItem(r);
        return row(r.item_id, <button type="button" onClick={() => (it.isFolder ? (setView("files"), setStack([{ id: null, name: "Staff Library" }, { id: it.id, name: it.name }])) : setPreviewing(it))} style={{ background: "none", border: 0, padding: 0, color: "var(--ui-text)", fontWeight: 600, cursor: "pointer" }}>{fileIcon(it) + " " + it.name}</button>,
          view === "recent" ? (r.actor_name ? r.actor_name + " " : "") + (ACTIONS[r.action] ?? r.action) + " · " + humanDate(r.created_at) : "Starred " + humanDate(r.created_at),
          view === "starred" ? <button type="button" style={small} onClick={() => void toggleStar(it).then(() => loadOther("starred"))}>Remove star</button> : undefined);
      }
      if (view === "shared") return row(r.id, r.item_name, "Expires " + humanDate(r.expires_at) + (r.has_password ? " · password" : "") + (r.allow_download ? "" : " · view only") + " · opened " + r.open_count + "x · by " + (r.created_by_name ?? ""),
        <button type="button" style={small} onClick={() => void act("turn off the link", () => L.revokeShare(r.id), "Link turned off.")}>Turn off</button>);
      if (view === "requests") return row(r.id, r.title, "Into " + r.folder_name + " · open until " + humanDate(r.expires_at) + " · " + r.upload_count + " uploaded · by " + (r.created_by_name ?? ""),
        <button type="button" style={small} onClick={() => void act("close the link", () => L.closeRequest(r.id), "Upload link closed.")}>Close</button>);
      if (view === "trash") return row(r.item_id, (r.is_folder ? "\u{1F4C1} " : "\u{1F4C4} ") + r.item_name, "Deleted " + humanDate(r.deleted_at) + (r.deleted_by_name ? " by " + r.deleted_by_name : "") + " · removed for good " + humanDate(r.purge_at),
        <span style={{ display: "flex", gap: 6 }}>
          <button type="button" style={small} onClick={() => void act("restore it", () => L.restore(r.item_id), r.item_name + " is back.")}>Restore</button>
          <button type="button" style={{ ...small, color: "#991b1b" }} onClick={() => { if (window.confirm("Delete " + r.item_name + " for good? This can't be undone here.")) void act("delete it", () => L.purge(r.item_id), "Deleted for good."); }}>Delete for good</button>
        </span>);
      return row(r.id, (r.actor_name ?? "Someone") + " " + (ACTIONS[r.action] ?? r.action) + " " + r.item_name, humanDate(r.created_at) + (r.detail ? " · " + r.detail : ""));
    });
  };

  return (
    <div data-testid="library-page" style={{ padding: 16, color: "var(--ui-text)", position: "relative", outline: dragging ? "3px dashed #1d4ed8" : undefined, outlineOffset: -6, minHeight: 300 }} {...pageDrop}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, margin: 0, flex: 1 }}>Staff Library</h1>
        {state === "ready" && <>
          <input ref={fileRef} type="file" multiple hidden data-testid="library-file-input" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
          <input ref={dirRef} type="file" multiple hidden data-testid="library-folder-input" {...({ webkitdirectory: "", directory: "" } as any)} onChange={(e) => { void uploadFolder(e.target.files); e.target.value = ""; }} />
          <button type="button" style={primary} disabled={busy} onClick={() => fileRef.current?.click()}>Upload files</button>
          <button type="button" style={btn} disabled={busy} onClick={() => dirRef.current?.click()}>Upload folder</button>
          <button type="button" style={btn} disabled={busy} onClick={() => void newFolder()}>New folder</button>
          <button type="button" style={btn} disabled={busy} onClick={() => setRequesting(true)} data-testid="library-request">Request files</button>
          <button type="button" style={btn} disabled={busy} onClick={() => zip(folder.id, folder.name)}>Download zip</button>
          {libUrl && <a href={libUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Open in OneDrive</a>}
          <button type="button" style={{ ...small, border: 0, background: "none", color: "#1d4ed8" }} onClick={() => setSyncHelp(true)}>Sync to my Mac / iPad</button>
        </>}
      </div>
      <p style={{ margin: "0 0 12px", color: "var(--ui-text-muted)", fontSize: 13 }}>Lender forms and anything staff should read. Everyone at Boreal can open these files. Drag files or folders here to upload them. To ask someone to read one, use Share in Team chat and tick Read this.</p>
      {notice && <div role="status" style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: notice.ok ? "#065f46" : "#991b1b" }}>{notice.text}</div>}
      {state === "loading" && <div style={{ color: "var(--ui-text-muted)" }}>Loading...</div>}
      {state === "missing" && <div data-testid="library-missing">The Staff Library has not been created yet. It will be a OneDrive folder shared with everyone at Boreal, with Lender Forms and Read This folders inside.<div style={{ marginTop: 10 }}><button type="button" style={primary} disabled={busy} onClick={() => void create()}>Create the Staff Library</button></div></div>}
      {state === "not_connected" && <div role="alert">Connect Microsoft 365 first: Settings, then Profile, then Connect Microsoft 365.</div>}
      {state === "error" && <div role="alert">Could not load the Staff Library. <button type="button" style={small} onClick={() => void load()}>Try again</button></div>}
      {state === "ready" && <>
        <div role="tablist" aria-label="Library views" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10, borderBottom: "1px solid var(--ui-border)" }}>
          {VIEWS.map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => { setView(k); setQ(""); }}
              style={{ background: "none", border: 0, borderBottom: view === k ? "2px solid #1d4ed8" : "2px solid transparent", padding: "6px 10px", fontWeight: view === k ? 700 : 500, color: "var(--ui-text)", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        {view === "files" && <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the whole library" aria-label="Search the library" data-testid="library-search"
              style={{ flex: "1 1 220px", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }} />
            <label style={{ fontSize: 13 }}>Sort <select value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Sort" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}>
              <option value="name">Name</option><option value="date">Date modified</option><option value="size">Size</option></select></label>
            <button type="button" style={small} aria-pressed={layout === "grid"} onClick={() => setLayout(layout === "list" ? "grid" : "list")} data-testid="library-layout">{layout === "list" ? "Grid view" : "List view"}</button>
          </div>
          {results ? <div style={{ fontSize: 13, marginBottom: 8 }}>{results.length} result{results.length === 1 ? "" : "s"} for "{q.trim()}" <button type="button" style={small} onClick={() => setQ("")}>Clear</button></div>
            : <div style={{ fontSize: 13, marginBottom: 8 }}>{stack.map((s, i) => <span key={i}>{i > 0 && " › "}<button type="button" onClick={() => setStack((st) => st.slice(0, i + 1))} {...dropTarget(s.id, s.name)} style={{ background: dropOn === (s.id ?? "root") ? "rgba(29,78,216,0.12)" : "none", border: "none", padding: 0, color: "#1d4ed8", cursor: "pointer", fontWeight: i === stack.length - 1 ? 700 : 400 }}>{s.name}</button></span>)}</div>}
          {shown.length === 0 ? <div style={{ color: "var(--ui-text-muted)" }}>{results ? "Nothing matches." : "This folder is empty. Upload files or drag them here."}</div> : layout === "list" ? listView : gridView}
        </>}
        {view !== "files" && <div data-testid={"library-view-" + view}>{otherView()}</div>}
      </>}
      {previewing && <PreviewPanel item={previewing} onClose={() => setPreviewing(null)} />}
      {sharing && <ShareDialog item={sharing} onClose={() => setSharing(null)} />}
      {sending && <SendDialog item={sending} onClose={() => setSending(null)} onSent={(t) => { setSending(null); setNotice({ ok: true, text: t }); }} />}
      {versionsOf && <VersionsDialog item={versionsOf} onClose={() => setVersionsOf(null)} onRestored={() => { setVersionsOf(null); setNotice({ ok: true, text: "Earlier version restored." }); void load(); }} />}
      {moving && <MoveDialog item={moving} onClose={() => setMoving(null)} onMoved={(to) => { setMoving(null); setNotice({ ok: true, text: "Moved to " + to + "." }); void load(); }} />}
      {requesting && <RequestDialog folder={folder} onClose={() => setRequesting(false)} />}
      {syncHelp && <SyncHelp libUrl={libUrl} onClose={() => setSyncHelp(false)} />}
    </div>
  );
}
