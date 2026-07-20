// BF_PORTAL_CONTACT_ONEDRIVE_v1 - per-contact OneDrive folder in the CRM right rail (BF only).
// Create a folder, open it, and list its files. Files live in the acting user's OneDrive under
// "Boreal CRM"; an organization edit link lets any staff member open it and see the files.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

type DriveFile = { id: string; name: string; webUrl?: string | null; isFolder?: boolean };

const btn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "var(--ui-accent-blue, #1f5eff)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
  boxSizing: "border-box",
};

export function ContactOneDrive({ contactId }: { contactId: string }) {
  const [hasFolder, setHasFolder] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.get<unknown>(`/api/o365/contacts/${encodeURIComponent(contactId)}/folder/files`);
      const body = ((r as { data?: unknown })?.data ?? r) as { hasFolder?: boolean; url?: string | null; files?: DriveFile[] };
      setHasFolder(!!body?.hasFolder);
      setUrl(body?.url ?? null);
      setFiles(Array.isArray(body?.files) ? body.files : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load OneDrive folder");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<unknown>(`/api/o365/contacts/${encodeURIComponent(contactId)}/folder`, {});
      const body = ((r as { data?: unknown })?.data ?? r) as { url?: string };
      if (body?.url) setUrl(body.url);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create folder - connect Microsoft 365 in Settings first.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>OneDrive</h3>
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>
      ) : !hasFolder ? (
        <button type="button" onClick={() => void create()} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Creating..." : "Create OneDrive folder"}
        </button>
      ) : (
        <div>
          <a
            href={url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btn, display: "block", textDecoration: "none", textAlign: "center" }}
          >
            Open OneDrive folder
          </a>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {files.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>No files yet - open the folder to add some.</div>
            ) : (
              files.map((f) => (
                <a
                  key={f.id}
                  href={f.webUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={f.name}
                  style={{ fontSize: 13, color: "#0091ae", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {f.isFolder ? "[folder] " : ""}{f.name}
                </a>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            style={{ ...btn, marginTop: 8, background: "transparent", color: "var(--ui-text-muted)", border: "1px solid var(--ui-border)" }}
          >
            Refresh files
          </button>
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{err}</div>}
    </div>
  );
}

export default ContactOneDrive;
