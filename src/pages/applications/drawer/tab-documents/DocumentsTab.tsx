// BF_PORTAL_v70_BLOCK_2_4 — Documents tab rebuild per locked spec.
import { useEffect, useMemo, useState } from "react";
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

export default function DocumentsTab({ applicationId }: Props) {
  const selectedApplicationId = usePipelineStore((state) => state.selectedApplicationId);
  const resolvedApplicationId = applicationId ?? selectedApplicationId ?? "";
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"required" | "other">("required");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
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
        const open = new Set<string>();
        for (const c of list) {
          if (c.required) {
            const hasAcceptedOrPending = c.files.some(
              (f) => f.status === "accepted" || f.status === "pending_review"
            );
            if (!hasAcceptedOrPending) open.add(c.key);
          }
        }
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
      await api.post(`/api/documents/${encodeURIComponent(fileId)}/${action}`, {});
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
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6 }}
          />
          <div role="tablist" style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden" }}>
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

        <div data-testid="docs-list" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          {visible.length === 0 ? (
            <div style={{ padding: 24, color: "#6b7280" }}>No documents in this view.</div>
          ) : (
            visible.map((c) => {
              const isOpen = openKeys.has(c.key);
              return (
                <div key={c.key} data-testid={`doc-cat-${c.key}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    style={{ width: "100%", textAlign: "left", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "transparent", cursor: "pointer" }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      📁 {c.label} {c.required ? <span style={{ color: "#b91c1c" }}>*</span> : null}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      {c.files.length} file{c.files.length === 1 ? "" : "s"} · {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 14px 12px" }}>
                      {c.files.length === 0 ? (
                        <div style={{ padding: 8, color: "#9ca3af", fontStyle: "italic" }}>No files uploaded.</div>
                      ) : (
                        c.files.map((f) => (
                          <div key={f.id} data-testid={`doc-file-${f.id}`} style={{ display: "flex", alignItems: "center", padding: "8px 6px", borderTop: "1px solid #f3f4f6", gap: 12 }}>
                            <div style={{ flex: 2, minWidth: 0 }}>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.filename}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                {fmtDate(f.uploadedAt)} · {fmtSize(f.size ?? null)}
                              </div>
                            </div>
                            <StatusPill s={f.status} />
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                data-testid={`doc-actions-${f.id}`}
                                onClick={() => setActionFor(actionFor === f.id ? null : f.id)}
                                style={{ padding: "6px 10px", border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, cursor: "pointer" }}
                              >
                                Actions ▾
                              </button>
                              {actionFor === f.id ? (
                                <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 1, minWidth: 140 }}>
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
                                </div>
                              ) : null}
                            </div>
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
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 12 }}>
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
