// BF_PORTAL_CONTACT_DOCUMENTS_v1
// Documents filed against a CRM contact (e.g. auto-filed inbound email attachments). Lists
// them and downloads each via the base64 JSON the server returns. Renders nothing when empty.
import { useEffect, useState, useCallback } from "react";
import { api } from "@/api";

type Doc = {
  id: string;
  filename: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  source?: string | null;
  createdAt?: string | null;
};

type DownloadResp = { data?: { name?: string; contentType?: string; contentBytes?: string } } & {
  name?: string;
  contentType?: string;
  contentBytes?: string;
};

export function ContactDocuments({ contactId, refreshKey }: { contactId: string; refreshKey?: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    let alive = true;
    setLoading(true);
    api
      .get<Doc[] | { data?: Doc[] }>(`/api/crm/contacts/${encodeURIComponent(contactId)}/documents`)
      .then((r) => {
        const list = Array.isArray(r) ? r : ((r as { data?: Doc[] }).data ?? []);
        if (alive) setDocs(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (alive) setDocs([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [contactId, refreshKey]);

  const download = useCallback(
    async (doc: Doc): Promise<void> => {
      const resp = await api.get<DownloadResp>(
        `/api/crm/contacts/${encodeURIComponent(contactId)}/documents/${encodeURIComponent(doc.id)}/download`,
      );
      const d = (resp as { data?: DownloadResp["data"] }).data ?? (resp as DownloadResp["data"]);
      if (!d?.contentBytes) return;
      const bin = atob(d.contentBytes);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: d.contentType ?? doc.contentType ?? "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.name ?? doc.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [contactId],
  );

  // BF_PORTAL_CONTACT_DOCS_EMPTY_v1 - show the section with an explanation instead of vanishing,
  // so "no documents on this contact" is distinguishable from "the panel failed to load".
  if (!docs.length && !loading) {
    return (
      <div style={{ marginTop: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Documents</h3>
        <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>
          No documents filed against this contact. Application documents live on the application record.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Documents{docs.length ? ` (${docs.length})` : ""}</h3>
      {loading && !docs.length ? (
        <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Loading...</div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {docs.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => void download(doc)}
            title={`Download ${doc.filename}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--ui-border)",
              background: "var(--ui-surface-muted)",
              color: "var(--ui-text)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
              {doc.filename}
            </span>
            <span style={{ fontSize: 11, color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>
              {doc.sizeBytes ? `${Math.max(1, Math.round(doc.sizeBytes / 1024))} KB` : ""}
              {doc.createdAt ? ` - ${new Date(doc.createdAt).toLocaleDateString()}` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
