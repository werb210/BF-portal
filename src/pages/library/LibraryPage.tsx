// BF_PORTAL_LIBRARY_PAGE_v762 - the Staff Library: one OneDrive folder shared with everyone at Boreal (lender forms,
// things staff must read). Browse folders, upload, open, copy a company link, or share a file in Team chat.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

type Item = { id: string; name: string; webUrl: string | null; size: number | null; lastModified: string | null; isFolder: boolean };
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
  const s = await api.post<{ uploadUrl?: string; chunkBytes?: number }>("/api/o365/library/upload-session", { name: file.name, folderId, size: file.size });
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

const btn = { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontWeight: 600, cursor: "pointer" } as const;
const primary = { ...btn, background: "#0B1F3A", color: "#fff", border: "1px solid #0B1F3A" } as const;
const small = { ...btn, padding: "4px 10px", fontSize: 12 } as const;

export default function LibraryPage() {
  const navigate = useNavigate();
  const [stack, setStack] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: "Staff Library" }]);
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "not_connected" | "error">("loading");
  const [libUrl, setLibUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folder = stack[stack.length - 1] ?? { id: null, name: "Staff Library" };

  const load = useCallback(async () => {
    setState("loading");
    try {
      const r = await api.get<{ configured?: boolean; url?: string; items?: Item[] }>("/api/o365/library" + (folder.id ? "?item=" + encodeURIComponent(folder.id) : ""));
      if (r?.configured === false) { setState("missing"); return; }
      setLibUrl(r?.url ?? null); setItems(r?.items ?? []); setState("ready");
    } catch (e: any) {
      setState(e?.status === 412 ? "not_connected" : "error");
    }
  }, [folder.id]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try { await api.post("/api/o365/library/ensure", {}); await load(); }
    catch (e: any) { setNotice({ ok: false, text: e?.status === 412 ? "Connect Microsoft 365 in Settings first." : "Could not create the Staff Library." }); }
    finally { setBusy(false); }
  };

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true); setNotice(null);
    let done = 0; const failed: string[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) { failed.push(f.name + " (over 200 MB - upload it in OneDrive)"); continue; }
      if (f.size === 0) { failed.push(f.name + " (empty file)"); continue; }
      try {
        setNotice({ ok: true, text: "Uploading " + f.name + "..." });
        await uploadInPieces(f, folder.id, (pct) => setNotice({ ok: true, text: "Uploading " + f.name + "... " + pct + "%" }));
        done++;
      } catch (e: any) { failed.push(f.name + (e?.details?.message ? " (" + e.details.message + ")" : "")); }
    }
    setNotice(failed.length ? { ok: false, text: (done ? "Uploaded " + done + ". " : "") + "Not uploaded: " + failed.join(", ") } : { ok: true, text: "Uploaded " + done + (done === 1 ? " file." : " files.") });
    setBusy(false); void load();
  };

  const newFolder = async () => {
    const name = window.prompt("Folder name");
    if (!name || !name.trim()) return;
    setBusy(true);
    try { await api.post("/api/o365/library/folder", { name: name.trim(), folderId: folder.id }); setNotice({ ok: true, text: "Folder created." }); await load(); }
    catch { setNotice({ ok: false, text: "Could not create the folder." }); }
    finally { setBusy(false); }
  };

  const copy = async (it: Item) => {
    if (!it.webUrl) return;
    try { await navigator.clipboard.writeText(it.webUrl); setNotice({ ok: true, text: "Link copied: " + it.name }); }
    catch { window.prompt("Copy this link", it.webUrl); }
  };

  return (
    <div data-testid="library-page" style={{ padding: 16, color: "var(--ui-text)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, margin: 0, flex: 1 }}>Staff Library</h1>
        {state === "ready" && <>
          <input ref={fileRef} type="file" multiple hidden data-testid="library-file-input" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
          <button type="button" style={primary} disabled={busy} onClick={() => fileRef.current?.click()}>Upload files</button>
          <button type="button" style={btn} disabled={busy} onClick={() => void newFolder()}>New folder</button>
          {libUrl && <a href={libUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Open in OneDrive</a>}
        </>}
      </div>
      <p style={{ margin: "0 0 12px", color: "var(--ui-text-muted)", fontSize: 13 }}>Lender forms and anything staff should read. Everyone at Boreal can open these files. To ask someone to read one, use Share in Team chat and tick Read this.</p>
      {notice && <div role="status" style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: notice.ok ? "#065f46" : "#991b1b" }}>{notice.text}</div>}
      {state === "ready" && <div style={{ fontSize: 13, marginBottom: 8 }}>{stack.map((s, i) => <span key={i}>{i > 0 && " › "}<button type="button" onClick={() => setStack((st) => st.slice(0, i + 1))} style={{ background: "none", border: "none", padding: 0, color: "#1d4ed8", cursor: "pointer", fontWeight: i === stack.length - 1 ? 700 : 400 }}>{s.name}</button></span>)}</div>}
      {state === "loading" && <div style={{ color: "var(--ui-text-muted)" }}>Loading...</div>}
      {state === "missing" && <div data-testid="library-missing">The Staff Library has not been created yet. It will be a OneDrive folder shared with everyone at Boreal, with Lender Forms and Read This folders inside.<div style={{ marginTop: 10 }}><button type="button" style={primary} disabled={busy} onClick={() => void create()}>Create the Staff Library</button></div></div>}
      {state === "not_connected" && <div role="alert">Connect Microsoft 365 first: Settings, then Profile, then Connect Microsoft 365.</div>}
      {state === "error" && <div role="alert">Could not load the Staff Library. <button type="button" style={small} onClick={() => void load()}>Try again</button></div>}
      {state === "ready" && (items.length === 0 ? <div style={{ color: "var(--ui-text-muted)" }}>This folder is empty. Upload files to add them.</div> :
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
          {items.map((it) => (
            <tr key={it.id} data-testid="library-row" style={{ borderTop: "1px solid var(--ui-border)" }}>
              <td style={{ padding: "8px 6px" }}>{it.isFolder
                ? <button type="button" onClick={() => setStack((s) => [...s, { id: it.id, name: it.name }])} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ui-text)", fontWeight: 600 }}>{"\u{1F4C1} "}{it.name}</button>
                : <span>{"\u{1F4C4} "}{it.name}</span>}</td>
              <td style={{ padding: "8px 6px", fontSize: 12, color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{it.isFolder ? "" : humanSize(it.size)}</td>
              <td style={{ padding: "8px 6px", fontSize: 12, color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{it.lastModified ? new Date(it.lastModified).toLocaleDateString("en-CA") : ""}</td>
              <td style={{ padding: "8px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{!it.isFolder && it.webUrl && <>
                <a href={it.webUrl} target="_blank" rel="noreferrer" style={{ ...small, textDecoration: "none", display: "inline-block", marginRight: 6 }}>Open</a>
                <button type="button" style={{ ...small, marginRight: 6 }} onClick={() => void copy(it)}>Copy link</button>
                <button type="button" data-testid="library-share" style={small} onClick={() => navigate(teamShareLink(it.name, it.webUrl as string))}>Share in Team chat</button>
              </>}</td>
            </tr>
          ))}
        </tbody></table></div>)}
    </div>
  );
}
