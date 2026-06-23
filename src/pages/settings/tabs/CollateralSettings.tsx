// BF_PORTAL_BLOCK_v694_COMMS — Collateral library tab.
// All staff can view/list; admins upload (multipart) and delete.
// Server: /api/collateral (GET list, POST upload [admin], DELETE /:id [admin]),
// GET /api/collateral/:id/file for download. Files attach in the composer.
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import api from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/errors";

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
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => void remove(a.id)}
                    style={{ padding: "4px 10px", border: "1px solid #f0c4c4", borderRadius: 6, background: "var(--ui-surface-strong)", color: "#b00020", cursor: "pointer", fontSize: 13 }}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
