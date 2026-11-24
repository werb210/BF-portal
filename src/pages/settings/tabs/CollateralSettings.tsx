// BF_PORTAL_BLOCK_v694_COMMS — Collateral library tab.
// All staff can view/list; admins upload (multipart) and delete.
// Server: /api/collateral (GET list, POST upload [admin], DELETE /:id [admin]),
// GET /api/collateral/:id/file for download. Files attach in the composer.
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import api from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/errors";
import { getAuthToken } from "@/lib/authToken";
import { API_BASE } from "@/config/api";

// BF_PORTAL_v_COLLATERAL_VIEW_DOWNLOAD - View opens the PDF in a new tab; Download saves it.
// BF_PORTAL_DESKTOP_COLLATERAL_v1 - the desktop app (Electron) refuses blank pop-up tabs and blob: pages, so View and
// Download did nothing there. In the app the PDF opens in a viewer inside the portal instead.
export const isDesktopShell = () => typeof window !== "undefined" && !!(window as any).borealDesktop;
export async function collateralBlob(id: string, fetchImpl: typeof fetch = fetch): Promise<Blob> {
  const token = getAuthToken();
  const r = await fetchImpl(`${String(API_BASE).replace(/\/+$/, "")}/api/collateral/${encodeURIComponent(id)}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw new Error(r.status === 404 ? "That file is missing." : "Could not open the file.");
  return r.blob();
}

type CollateralAsset = {
  id: string;
  name: string;
  audience: string | null;
  doc_type: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at?: string;
};

export default function CollateralSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [assets, setAssets] = useState<CollateralAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null);
  const closeViewer = () => { if (viewer) URL.revokeObjectURL(viewer.url); setViewer(null); };

  const load = useCallback(() => {
    api
      .get<CollateralAsset[]>("/api/collateral")
      .then((res: any) => {
        // BF_PORTAL_BLOCK_v697_COLLATERAL_LIST_FIX_v1 — server returns { items: [...] };
        // unwrap it instead of treating the envelope as the array (list was always empty).
        const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [];
        setAssets(list);
        setLoaded(true);
      })
      .catch((e) => {
        setError(getErrorMessage(e, "Unable to load collateral."));
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (name.trim()) fd.append("name", name.trim());
      await api.post("/api/collateral", fd);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      setError(getErrorMessage(e, "Upload failed."));
    } finally {
      setUploading(false);
    }
  }

  async function openFile(a: CollateralAsset, download: boolean) {
    setError(null);
    // Open the tab first so Safari/iPad does not block it as a pop-up.
    const desktop = isDesktopShell();
    const win = download || desktop ? null : window.open("", "_blank");
    try {
      const blob = await collateralBlob(a.id);
      const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: "application/pdf" }));
      if (desktop && !download) {
        setViewer({ url, name: a.name });
        return;
      }
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = /\.pdf$/i.test(a.name) ? a.name : `${a.name}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (win) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      setError(getErrorMessage(e, "Could not open the file."));
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/api/collateral/${id}`);
      load();
    } catch (e) {
      setError(getErrorMessage(e, "Delete failed."));
    }
  }

  return (
    <div className="settings-panel" aria-label="Collateral library">
      <h2 style={{ margin: "0 0 4px 0" }}>Collateral</h2>
      <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6b7280" }}>
        Shared PDFs that any staff member can attach to an email from the composer.
        {isAdmin ? " Upload and manage files below." : " Ask an admin to add or remove files."}
      </p>

      {error && <div style={{ color: "#b00020", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {viewer && (
        <div role="dialog" aria-label={`Viewing ${viewer.name}`} data-testid="collateral-viewer"
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--ui-surface-strong, #fff)", borderRadius: 10, width: "min(1000px, 100%)", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--ui-border)" }}>
              <strong style={{ flex: 1, fontSize: 14 }}>{viewer.name}</strong>
              <a href={viewer.url} download={/\.pdf$/i.test(viewer.name) ? viewer.name : `${viewer.name}.pdf`}
                style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>Download</a>
              <button type="button" onClick={closeViewer}
                style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", cursor: "pointer", fontSize: 13 }}>Close</button>
            </div>
            <iframe title={viewer.name} src={viewer.url} style={{ flex: 1, border: 0, width: "100%" }} />
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13 }}>
            Display name (optional)
            <br />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boreal One-Pager"
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", marginTop: 4 }}
            />
          </label>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={() => setError(null)} style={{ fontSize: 13 }} />
          <div>
            <Button type="button" onClick={() => void upload()} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      )}

      <div>
        {!loaded ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading…</p>
        ) : assets.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>No collateral uploaded yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {assets.map((a) => (
              <li
                key={a.id}
                style={{ border: "1px solid var(--ui-surface-muted)", borderRadius: 6, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
              >
                <span style={{ fontSize: 14 }}>
                  <strong>{a.name}</strong>{" "}
                  {a.size_bytes != null && (
                    <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>· {Math.round(a.size_bytes / 1024)} KB</span>
                  )}
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => void openFile(a, false)} data-testid="collateral-view"
                  style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", cursor: "pointer", fontSize: 13 }}>
                  View
                </button>
                <button type="button" onClick={() => void openFile(a, true)} data-testid="collateral-download"
                  style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", cursor: "pointer", fontSize: 13 }}>
                  Download
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => void remove(a.id)}
                    style={{ padding: "4px 10px", border: "1px solid #f0c4c4", borderRadius: 6, background: "var(--ui-surface-strong)", color: "#b00020", cursor: "pointer", fontSize: 13 }}
                  >
                    Delete
                  </button>
                )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
