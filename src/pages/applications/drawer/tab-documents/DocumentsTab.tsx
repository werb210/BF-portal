// BF_PORTAL_v70_BLOCK_2_4 — Documents tab rebuild per locked spec.
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
import { usePipelineStore } from "@/core/engines/pipeline/pipeline.store";

type DocStatus = "accepted" | "rejected" | "pending_review" | "required";
type DocFile = {
  id: string;
  filename: string;
  size?: number | null;
  uploadedAt?: string | null;
  status: DocStatus;
  url?: string | null;
};
type DocCategory = {
  key: string;
  label: string;
  required: boolean;
  files: DocFile[];
};

type ApiShape =
  | { categories?: DocCategory[] }
  | DocCategory[];

type Props = { applicationId?: string };

const STATUS_LABEL: Record<DocStatus, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  pending_review: "Pending Review",
  required: "Required",
};
const STATUS_COLOR: Record<DocStatus, string> = {
  accepted: "#10b981",
  rejected: "#ef4444",
  pending_review: "#f59e0b",
  required: "#6b7280",
};

function fmtSize(n: number | null | undefined): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString();
}

function StatusPill({ s }: { s: DocStatus }) {
  return (
    <span
      data-testid="doc-status"
      style={{
        background: `${STATUS_COLOR[s]}1a`,
        color: STATUS_COLOR[s],
        fontWeight: 600,
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        textTransform: "uppercase",
      }}
    >
      {STATUS_LABEL[s]}
    </span>
  );
}


// v186: OCR preview helper component. Use inside the per-file row:
//   {expandedFiles.has(file.id) && <OcrPreviewBlock state={ocrCache[file.id]} />}
function OcrPreviewBlock({ state }: { state?: { ocr_text?: string; ocr_tables?: unknown[]; loading?: boolean; error?: string } }) {
  if (!state) return null;
  if (state.loading) return <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--ui-text-muted)" }}>Loading OCR result…</div>;
  if (state.error) return <div style={{ padding: "8px 12px", fontSize: 12, color: "#b91c1c" }}>OCR error: {state.error}</div>;
  if (!state.ocr_text && !state.ocr_tables?.length) return <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--ui-text-muted)" }}>OCR has no extracted text for this file.</div>;
  return (
    <div style={{ padding: "8px 12px", background: "var(--ui-surface-muted)", borderTop: "1px solid var(--ui-border)", fontSize: 12 }}>
      {state.ocr_text && (
        <div style={{ whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {state.ocr_text.slice(0, 4000)}
          {state.ocr_text.length > 4000 ? " …(truncated)" : ""}
        </div>
      )}
      {Array.isArray(state.ocr_tables) && state.ocr_tables.length > 0 && (
        <div style={{ marginTop: 8, color: "var(--ui-text-muted)" }}>{state.ocr_tables.length} extracted table(s).</div>
      )}
    </div>
  );
}

export default function DocumentsTab({ applicationId }: Props) {
  const selectedApplicationId = usePipelineStore((state) => state.selectedApplicationId);
  const resolvedApplicationId = applicationId ?? selectedApplicationId ?? "";
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"required" | "other">("required");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  // v186: OCR preview cache — per-document, fetched on expand.
  const [ocrCache, setOcrCache] = useState<Record<string, { ocr_text?: string; ocr_tables?: unknown[]; loading?: boolean; error?: string }>>({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const fetchOcr = async (fileId: string) => {
    if (ocrCache[fileId] && !ocrCache[fileId].error) return;
    setOcrCache((p) => ({ ...p, [fileId]: { loading: true } }));
    try {
      const data = await api.get<{ ocr_text?: string; ocr_tables?: unknown[] }>(`/api/ocr/admin/documents/${encodeURIComponent(fileId)}/result`);
      setOcrCache((p) => ({ ...p, [fileId]: { ocr_text: data?.ocr_text, ocr_tables: data?.ocr_tables, loading: false } }));
    } catch (e) {
      setOcrCache((p) => ({ ...p, [fileId]: { error: e instanceof Error ? e.message : "fetch_failed" } }));
    }
  };
  const toggleFileExpanded = (fileId: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else { next.add(fileId); void fetchOcr(fileId); }
      return next;
    });
  };
  const [actionFor, setActionFor] = useState<string | null>(null);

  useEffect(() => {
    if (!resolvedApplicationId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const resp = await api.get<ApiShape>(`/api/applications/${encodeURIComponent(resolvedApplicationId)}/documents`);
        if (!active) return;
        const list = Array.isArray(resp) ? resp : Array.isArray(resp?.categories) ? resp.categories : [];
        setCategories(list);
        // Default-open required-but-incomplete folders
        // BF_PORTAL_BLOCK_57R_CAL_DOCS_DELETE_REFERRER_COMMS_v2 - all open.
        const open = new Set<string>(list.map((c) => c.key));
        setOpenKeys(open);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedApplicationId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .filter((c) => (filter === "required" ? c.required : !c.required))
      .map((c) => {
        if (!q) return c;
        return {
          ...c,
          files: c.files.filter(
            (f) => f.filename.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
          ),
        };
      })
      .filter((c) => c.files.length > 0 || filter === "required");
  }, [categories, search, filter]);

  const counts = useMemo(() => {
    const all = categories.flatMap((c) => c.files);
    return {
      accepted: all.filter((f) => f.status === "accepted").length,
      rejected: all.filter((f) => f.status === "rejected").length,
      pending_review: all.filter((f) => f.status === "pending_review").length,
      required: all.filter((f) => f.status === "required").length,
    };
  }, [categories]);

  const missingRequired = useMemo(
    () =>
      categories
        .filter((c) => c.required)
        .filter((c) => !c.files.some((f) => f.status === "accepted")),
    [categories]
  );

  const toggle = (key: string) => {
    setOpenKeys((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateFileStatus = async (fileId: string, action: "accept" | "reject") => {
    try {
      // BF_PORTAL_BLOCK_v311_DOCUMENTS_TAB_PORTAL_PREFIX_v1
      // Pre-fix this POSTed to /api/documents/:id/${action}, which is the
      // stripped-down stub in BF-Server src/routes/documents.ts (only updates
      // documents.status with no side effects). The full workflow lives at
      // /api/portal/documents/:id/${action} in src/routes/portal.ts:
      //   - on accept: transitions pipeline_state to "Off to Lender" when all
      //     docs are accepted, fires computeAndCacheLenderMatches.
      //   - on reject: auto-SMS to applicant, marks lender_match_cache stale,
      //     transitions pipeline_state to "Documents Required".
      // The stub bypassed all of that and silently swallowed DB errors.
      // v277 BI pattern (UI calling wrong prefix).
      await api.post(`/api/portal/documents/${encodeURIComponent(fileId)}/${action}`, {});
      setCategories((cur) =>
        cur.map((c) => ({
          ...c,
          files: c.files.map((f) =>
            f.id === fileId
              ? { ...f, status: action === "accept" ? "accepted" : "rejected" }
              : f
          ),
        }))
      );
      setActionFor(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("doc_action_failed", e);
    }
  };
  const deleteFile = async (categoryKey: string, fileId: string) => {
    if (!window.confirm("Delete this document permanently? The client will NOT be re-prompted.")) return;
    try {
      await api.delete(`/api/applications/${encodeURIComponent(resolvedApplicationId)}/documents/${encodeURIComponent(fileId)}`);
      setCategories((cur) => cur.map((c) => c.key === categoryKey ? { ...c, files: c.files.filter((f) => f.id !== fileId) } : c));
      setActionFor(null);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) return <div data-testid="docs-loading">Loading documents…</div>;
  if (error)   return <div data-testid="docs-error" style={{ color: "#b91c1c" }}>{error}</div>;

  return (
    <div className="docs-tab" data-testid="documents-tab" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            data-testid="docs-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents"
            style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--ui-border)", borderRadius: 6 }}
          />
          <div role="tablist" style={{ display: "flex", border: "1px solid var(--ui-border)", borderRadius: 6, overflow: "hidden" }}>
            <button
              role="tab"
              aria-selected={filter === "required"}
              data-testid="docs-filter-required"
              onClick={() => setFilter("required")}
              style={{ padding: "8px 12px", border: "none", background: filter === "required" ? "#2563eb" : "#fff", color: filter === "required" ? "#fff" : "#374151", cursor: "pointer" }}
            >
              Required documents
            </button>
            <button
              role="tab"
              aria-selected={filter === "other"}
              data-testid="docs-filter-other"
              onClick={() => setFilter("other")}
              style={{ padding: "8px 12px", border: "none", background: filter === "other" ? "#2563eb" : "#fff", color: filter === "other" ? "#fff" : "#374151", cursor: "pointer" }}
            >
              Other documents
            </button>
          </div>
        </div>

        <div data-testid="docs-list" style={{ background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8 }}>
          {visible.length === 0 ? (
            <div style={{ padding: 24, color: "var(--ui-text-muted)" }}>No documents in this view.</div>
          ) : (
            visible.map((c) => {
              const isOpen = openKeys.has(c.key);
              return (
                <div key={c.key} data-testid={`doc-cat-${c.key}`} style={{ borderBottom: "1px solid var(--ui-border)" }}>
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    style={{ width: "100%", textAlign: "left", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "transparent", cursor: "pointer" }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      📁 {c.label} {c.required ? <span style={{ color: "#b91c1c" }}>*</span> : null}
                    </span>
                    <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>
                      {c.files.length} file{c.files.length === 1 ? "" : "s"} · {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 14px 12px" }}>
                      {c.files.length === 0 ? (
                        <div style={{ padding: 8, color: "var(--ui-text-muted)", fontStyle: "italic" }}>No files uploaded.</div>
                      ) : (
                        c.files.map((f) => (
                          // v188: row expand for OCR preview
                          <div key={f.id} style={{ borderTop: "1px solid var(--ui-border-soft)" }}>
                            <div data-testid={`doc-file-${f.id}`} style={{ display: "flex", alignItems: "center", padding: "8px 6px", gap: 12 }}>
                              <button
                                type="button"
                                onClick={() => toggleFileExpanded(f.id)}
                                aria-expanded={expandedFiles.has(f.id)}
                                title={expandedFiles.has(f.id) ? "Hide OCR text" : "Show OCR text"}
                                style={{ flex: 2, minWidth: 0, textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                              >
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ui-text)" }}>
                                  {expandedFiles.has(f.id) ? "▾" : "▸"} {f.filename}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>
                                  {fmtDate(f.uploadedAt)} · {fmtSize(f.size ?? null)}
                                </div>
                              </button>
                            <StatusPill s={f.status} />
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                data-testid={`doc-actions-${f.id}`}
                                onClick={() => setActionFor(actionFor === f.id ? null : f.id)}
                                style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 6, cursor: "pointer" }}
                              >
                                Actions ▾
                              </button>
                              {actionFor === f.id ? (
                                <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 1, minWidth: 140 }}>
                                  {f.url ? (
                                    <a href={f.url} target="_blank" rel="noopener noreferrer" role="menuitem" style={{ display: "block", padding: "8px 12px", color: "#111", textDecoration: "none" }}>View</a>
                                  ) : null}
                                  <button
                                    type="button"
                                    role="menuitem"
                                    data-testid={`doc-accept-${f.id}`}
                                    onClick={() => void updateFileStatus(f.id, "accept")}
                                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", color: "#065f46" }}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    data-testid={`doc-reject-${f.id}`}
                                    onClick={() => void updateFileStatus(f.id, "reject")}
                                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", color: "#b91c1c" }}
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => void deleteFile(c.key, f.id)}
                                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", color: "#dc2626" }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          {expandedFiles.has(f.id) && <OcrPreviewBlock state={ocrCache[f.id]} />}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <aside>
        <div style={{ background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Status Summary</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4, fontSize: 13 }}>
            <li>✅ Accepted: <strong>{counts.accepted}</strong></li>
            <li>❌ Rejected: <strong>{counts.rejected}</strong></li>
            <li>⏳ Pending Review: <strong>{counts.pending_review}</strong></li>
            <li>📋 Required: <strong>{counts.required}</strong></li>
          </ul>
        </div>

        {missingRequired.length > 0 ? (
          <div data-testid="docs-blocked-callout" style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: 14 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>⚠ Credit Summary Generation Blocked</h3>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#78350f" }}>
              Missing required documents:
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {missingRequired.map((c) => (
                <li key={c.key}>{c.label}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
