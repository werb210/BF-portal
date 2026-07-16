// BF_PORTAL_O365_UI_v1 - OneDrive file browser: recent + search + copy org view link
// (GET /api/o365/files/recent, GET /api/o365/files/search, POST /api/o365/files/:id/link).
import { useEffect, useState } from "react";
import { api } from "@/api";

type DriveFile = {
  id: string;
  name: string;
  webUrl: string | null;
  size: number | null;
  lastModified: string | null;
  isFolder: boolean;
};

function humanSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OneDriveFilePicker() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [query, setQuery] = useState("");
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = (search: string) => {
    setLoading(true);
    const trimmed = search.trim();
    const path = trimmed
      ? `/api/o365/files/search?q=${encodeURIComponent(trimmed)}`
      : "/api/o365/files/recent";
    api
      .get<{ files?: DriveFile[] }>(path)
      .then((r) => { setFiles(Array.isArray(r.files) ? r.files : []); setConnected(true); })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(""); }, []);

  const copyLink = async (id: string) => {
    try {
      const r = await api.post<{ link?: string | null }>(`/api/o365/files/${encodeURIComponent(id)}/link`, {});
      if (r.link) {
        await navigator.clipboard.writeText(r.link).catch(() => {});
        setCopied(id);
        window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <section style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #eaf0f6" }}>
      <h3 style={{ marginTop: 0 }}>OneDrive files</h3>
      {!connected ? (
        <p style={{ color: "#516f90", fontSize: 13 }}>Connect Microsoft 365 above to browse your OneDrive files.</p>
      ) : (
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") load(query); }}
              placeholder="Search your OneDrive..."
              style={{ flex: 1, padding: "6px 10px", borderRadius: 4, border: "1px solid #cbd6e2" }}
            />
            <button type="button" onClick={() => load(query)} style={{ padding: "6px 14px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Search</button>
            {query && <button type="button" onClick={() => { setQuery(""); load(""); }} style={{ padding: "6px 12px", background: "none", color: "#516f90", border: "1px solid #cbd6e2", borderRadius: 4, cursor: "pointer" }}>Recent</button>}
          </div>
          {loading ? (
            <p style={{ color: "#516f90", fontSize: 13 }}>Loading...</p>
          ) : files.length === 0 ? (
            <p style={{ color: "#516f90", fontSize: 13 }}>No files found.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {files.map((f) => (
                <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid #eaf0f6", borderRadius: 4 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.isFolder ? "\u{1F4C1} " : ""}{f.webUrl ? <a href={f.webUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ui-accent-blue)" }}>{f.name}</a> : f.name}
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: "#8093a8" }}>{humanSize(f.size)}</span>
                  </span>
                  {!f.isFolder && (
                    <button type="button" onClick={() => void copyLink(f.id)} style={{ padding: "5px 10px", fontSize: 12, background: "none", color: "#516f90", border: "1px solid #cbd6e2", borderRadius: 4, cursor: "pointer", flexShrink: 0 }}>
                      {copied === f.id ? "Copied!" : "Copy link"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
