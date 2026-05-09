// BF_PORTAL_BLOCK_1_28B_TAB_CONTENT_REBUILD
// BF_PORTAL_BLOCK_v182_DOCUMENTS_TAB_FULL_BUILD_v1
//
// Real DocumentsTab. Per-doc status pill + OCR badge + Accept/Reject actions.
// Rejected docs show reason inline. Each accept/reject triggers a refetch
// (which also re-fires the v198 lender-match gate on the server side: when
// the last outstanding doc transitions to accepted, matchLenders() runs and
// the Lenders tab unlocks; when a doc is rejected, the cache flips to stale).
//
// Preview button is grey/disabled — a signed-URL document endpoint does not
// yet exist on BF-Server. When that ships, swap the disabled button for an
// <a href> to the URL.

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
// BF_PORTAL_BLOCK_v189_TAB_FIXES_ROUNDUP_v1 — switched off the @/utils/api strict envelope wrapper
import { api } from "@/api";
import { apiBlob } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { canWrite } from "@/auth/can";

interface Props { applicationId?: string }

type DocStatus = "accepted" | "rejected" | "pending" | string;
type OcrStatus = "pending" | "processing" | "completed" | "failed" | string | null;

type DocumentRow = {
  documentId: string;
  category: string | null;
  title: string | null;
  filename: string | null;
  mimeType: string | null;
  size: number | null;
  storageKey: string | null;
  createdAt: string | null;
  status?: DocStatus;
  rejectionReason?: string | null;
  ocrStatus?: OcrStatus;
};

type PortalApplicationResponse = { documents?: DocumentRow[] };

const CATEGORY_GROUPS = [
  { id: "banking",     label: "Banking",              matches: (c: string) => /bank|statement/i.test(c) },
  { id: "financials",  label: "Financial Statements", matches: (c: string) => /financial|income|p_?l|profit|balance/i.test(c) },
  { id: "tax",         label: "Tax Documents",        matches: (c: string) => /tax|t1|t2|return/i.test(c) },
  { id: "legal",       label: "Legal & Corporate",    matches: (c: string) => /article|incorporation|bylaw|operating.?agreement|legal/i.test(c) },
  { id: "id",          label: "Identification",       matches: (c: string) => /\bid\b|driver|passport|license/i.test(c) },
];

export default function DocumentsTab({ applicationId }: Props) {
  const { user } = useAuth();
  const canManage = canWrite((user as { role?: string | null } | null)?.role ?? null);

  const [docs, setDocs]       = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [working, setWorking] = useState<Record<string, "accept" | "reject" | undefined>>({});
  const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  // BF_PORTAL_BLOCK_v184_DOC_PREVIEW_WIRE_UP_v1
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});

  async function handlePreview(docId: string, filename: string | null) {
    if (previewing[docId]) return;
    setPreviewing((p) => ({ ...p, [docId]: true }));
    setActionError(null);
    let objectUrl: string | null = null;
    try {
      const blob = await apiBlob(`/api/portal/documents/${docId}/file`);
      objectUrl = URL.createObjectURL(blob);
      const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked — fall back to download
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename ?? `document-${docId}`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      // Revoke after a delay so the new tab can finish loading
      const urlToRevoke = objectUrl;
      setTimeout(() => URL.revokeObjectURL(urlToRevoke), 60_000);
    } catch (e) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setActionError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewing((p) => ({ ...p, [docId]: false }));
    }
  }

  const reload = useCallback(async () => {
    if (!applicationId) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.get<PortalApplicationResponse>(`/api/portal/applications/${applicationId}`);
      setDocs(Array.isArray(r?.documents) ? r.documents : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { void reload(); }, [reload]);

  async function handleAccept(docId: string) {
    if (working[docId]) return;
    setWorking((w) => ({ ...w, [docId]: "accept" }));
    setActionError(null);
    try {
      await api.post(`/api/portal/documents/${docId}/accept`, {});
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Accept failed");
    } finally {
      setWorking((w) => ({ ...w, [docId]: undefined }));
    }
  }

  async function handleReject(docId: string) {
    const reason = (rejectDraft[docId] ?? "").trim();
    if (!reason) { setActionError("Rejection reason is required."); return; }
    if (working[docId]) return;
    setWorking((w) => ({ ...w, [docId]: "reject" }));
    setActionError(null);
    try {
      await api.post(`/api/portal/documents/${docId}/reject`, { reason });
      setRejectOpen((r) => ({ ...r, [docId]: false }));
      setRejectDraft((r) => ({ ...r, [docId]: "" }));
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setWorking((w) => ({ ...w, [docId]: undefined }));
    }
  }

  const grouped = useMemo(() => groupAndSortDocs(docs), [docs]);
  const counts = useMemo(() => countByStatus(docs), [docs]);

  if (!applicationId) return <div style={styles.placeholder}>Select an application to view documents.</div>;
  if (loading)        return <div style={styles.placeholder}>Loading documents…</div>;
  if (error)          return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.page}>
            <ReocrToolbar applicationId={applicationId} />
<header style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Documents</h2>
          <div style={styles.subtitle}>
            <CountPill label="Accepted" n={counts.accepted} tone="green" />
            <CountPill label="Pending"  n={counts.pending}  tone="amber" />
            <CountPill label="Rejected" n={counts.rejected} tone="red" />
            <span style={styles.subtitleSep}>·</span>
            <span style={styles.subtitleTotal}>{docs.length} total</span>
          </div>
        </div>
      </header>

      {actionError && (
        <div role="alert" style={styles.actionError}>{actionError}</div>
      )}

      {grouped.length === 0 ? (
        <div style={styles.emptyAll}>No documents have been uploaded.</div>
      ) : (
        grouped.map(([groupId, group]) => (
          <section key={groupId} style={styles.section}>
            <h3 style={styles.sectionTitle}>
              {group.label}
              <span style={styles.sectionCount}>({group.docs.length})</span>
            </h3>
            <div style={styles.docList}>
              {group.docs.map((doc) => (
                <DocRow
                  key={doc.documentId}
                  doc={doc}
                  canManage={canManage}
                  working={working[doc.documentId]}
                  previewing={!!previewing[doc.documentId]}
                  rejectOpen={!!rejectOpen[doc.documentId]}
                  rejectDraft={rejectDraft[doc.documentId] ?? ""}
                  onPreview={() => handlePreview(doc.documentId, doc.filename)}
                  onAccept={() => handleAccept(doc.documentId)}
                  onRejectOpen={() => setRejectOpen((r) => ({ ...r, [doc.documentId]: true }))}
                  onRejectCancel={() => {
                    setRejectOpen((r) => ({ ...r, [doc.documentId]: false }));
                    setRejectDraft((r) => ({ ...r, [doc.documentId]: "" }));
                  }}
                  onRejectChange={(v) => setRejectDraft((r) => ({ ...r, [doc.documentId]: v }))}
                  onRejectSubmit={() => handleReject(doc.documentId)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function DocRow(props: {
  doc: DocumentRow;
  canManage: boolean;
  working: "accept" | "reject" | undefined;
  previewing: boolean;
  rejectOpen: boolean;
  rejectDraft: string;
  onPreview: () => void;
  onAccept: () => void;
  onRejectOpen: () => void;
  onRejectCancel: () => void;
  onRejectChange: (v: string) => void;
  onRejectSubmit: () => void;
}) {
  const { doc, canManage, working, previewing, rejectOpen, rejectDraft } = props;
  const status = (doc.status ?? "pending").toLowerCase() as DocStatus;
  const isRejected = status === "rejected";
  const isAccepted = status === "accepted";

  return (
    <div style={styles.docRow}>
      <div style={styles.docMain}>
        <div style={styles.docTopLine}>
          <span style={styles.filename}>{doc.filename ?? doc.title ?? "(untitled)"}</span>
          <StatusPill status={status} />
          <OcrBadge ocr={doc.ocrStatus} />
        </div>
        <div style={styles.docMeta}>
          {fmtSize(doc.size)} · uploaded {fmtDate(doc.createdAt)}
          {doc.category ? <> · <span style={styles.categoryTag}>{doc.category}</span></> : null}
        </div>
        {isRejected && doc.rejectionReason ? (
          <div style={styles.rejectionReason}>
            <strong>Rejection reason:</strong> {doc.rejectionReason}
          </div>
        ) : null}
      </div>

      <div style={styles.docActions}>
        <button
          type="button"
          onClick={props.onPreview}
          disabled={previewing}
          title={previewing ? "Opening…" : "Open document in a new tab"}
          style={previewing ? styles.previewButtonLoading : styles.previewButton}
        >
          {previewing ? "Opening…" : "Preview"}
        </button>
        {canManage && !rejectOpen && (
          <>
            <button
              type="button"
              onClick={props.onAccept}
              disabled={isAccepted || !!working}
              style={isAccepted ? styles.acceptButtonDone : styles.acceptButton}
              title={isAccepted ? "Already accepted" : "Mark accepted"}
            >
              {working === "accept" ? "Accepting…" : isAccepted ? "✓ Accepted" : "Accept"}
            </button>
            <button
              type="button"
              onClick={props.onRejectOpen}
              disabled={!!working}
              style={isRejected ? styles.rejectButtonDone : styles.rejectButton}
              title={isRejected ? "Currently rejected — click to reject again with new reason" : "Reject"}
            >
              {isRejected ? "✕ Rejected" : "Reject"}
            </button>
          </>
        )}
      </div>

      {canManage && rejectOpen && (
        <div style={styles.rejectFormRow}>
          <textarea
            value={rejectDraft}
            onChange={(e) => props.onRejectChange(e.target.value)}
            placeholder="Why is this document being rejected? (visible to the applicant)"
            rows={2}
            style={styles.rejectTextarea}
            disabled={working === "reject"}
          />
          <div style={styles.rejectFormActions}>
            <button
              type="button"
              onClick={props.onRejectCancel}
              disabled={working === "reject"}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={props.onRejectSubmit}
              disabled={working === "reject" || rejectDraft.trim().length === 0}
              style={styles.confirmRejectButton}
            >
              {working === "reject" ? "Rejecting…" : "Confirm reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: DocStatus }) {
  const tone =
    status === "accepted" ? styles.pillGreen :
    status === "rejected" ? styles.pillRed :
    styles.pillAmber;
  const label =
    status === "accepted" ? "Accepted" :
    status === "rejected" ? "Rejected" :
    "Pending";
  return <span style={{ ...styles.pillBase, ...tone }}>{label}</span>;
}

function OcrBadge({ ocr }: { ocr: OcrStatus | undefined }) {
  if (!ocr) return null;
  const s = String(ocr).toLowerCase();
  const tone =
    s === "completed" ? styles.ocrGreen :
    s === "failed"    ? styles.ocrRed   :
                        styles.ocrBlue;
  const label =
    s === "completed"  ? "OCR ✓" :
    s === "failed"     ? "OCR failed" :
    s === "processing" ? "OCR processing…" :
                         "OCR queued";
  return <span style={{ ...styles.ocrBase, ...tone }}>{label}</span>;
}

function CountPill({ label, n, tone }: { label: string; n: number; tone: "green" | "amber" | "red" }) {
  const styleMap = { green: styles.pillGreen, amber: styles.pillAmber, red: styles.pillRed };
  return (
    <span style={{ ...styles.countPillBase, ...styleMap[tone] }}>
      {label} <strong style={{ marginLeft: 4 }}>{n}</strong>
    </span>
  );
}

function statusOrder(s: DocStatus | undefined): number {
  switch ((s ?? "pending").toLowerCase()) {
    case "rejected": return 0;
    case "pending":  return 1;
    case "accepted": return 2;
    default:         return 3;
  }
}

function groupAndSortDocs(docs: DocumentRow[]) {
  const map = new Map<string, { label: string; docs: DocumentRow[] }>();
  CATEGORY_GROUPS.forEach((g) => map.set(g.id, { label: g.label, docs: [] }));
  map.set("other", { label: "Other", docs: [] });
  docs.forEach((doc) => {
    const cat = (doc.category ?? "").toLowerCase();
    const found = CATEGORY_GROUPS.find((g) => g.matches(cat));
    map.get(found?.id ?? "other")!.docs.push(doc);
  });
  for (const [, group] of map) {
    group.docs.sort((a, b) => {
      const sa = statusOrder(a.status);
      const sb = statusOrder(b.status);
      if (sa !== sb) return sa - sb;
      const da = a.createdAt ? Date.parse(a.createdAt) : 0;
      const db = b.createdAt ? Date.parse(b.createdAt) : 0;
      return db - da;
    });
  }
  return Array.from(map.entries()).filter(([, v]) => v.docs.length > 0);
}

function countByStatus(docs: DocumentRow[]): { accepted: number; pending: number; rejected: number } {
  const out = { accepted: 0, pending: 0, rejected: 0 };
  for (const d of docs) {
    const s = (d.status ?? "pending").toLowerCase();
    if (s === "accepted") out.accepted++;
    else if (s === "rejected") out.rejected++;
    else out.pending++;
  }
  return out;
}

function fmtSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

const styles: Record<string, CSSProperties> = {
  page: { padding: "16px 4px", maxWidth: 1200 },
  placeholder: { padding: 24, color: "#64748b" },
  error: { padding: 24, color: "#b91c1c" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a" },
  subtitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b", marginTop: 6, flexWrap: "wrap" as const },
  subtitleSep: { opacity: 0.4 },
  subtitleTotal: { color: "#0f172a", fontWeight: 600 },
  actionError: { color: "#b91c1c", padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13 },
  emptyAll: { padding: 24, color: "#94a3b8", fontStyle: "italic", textAlign: "center", border: "1px dashed #e2e8f0", borderRadius: 8 },

  section: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px 4px", marginBottom: 12, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" },
  sectionTitle: { fontSize: 12, fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 },
  sectionCount: { marginLeft: 8, color: "#94a3b8", fontSize: 12, fontWeight: 600 },
  docList: { display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12 },

  docRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, alignItems: "center", background: "#fff" },
  docMain: { minWidth: 0 },
  docTopLine: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
  filename: { fontWeight: 600, color: "#0f172a", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 380 },
  docMeta: { fontSize: 12, color: "#64748b", marginTop: 4 },
  categoryTag: { background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 11 },
  rejectionReason: { marginTop: 8, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#7f1d1d" },

  docActions: { display: "flex", gap: 6, alignItems: "center" },
  previewButtonDisabled: { padding: "5px 10px", background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "not-allowed", fontFamily: "inherit" },
  // BF_PORTAL_BLOCK_v184_DOC_PREVIEW_WIRE_UP_v1
  previewButton: { padding: "5px 10px", background: "#fff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  previewButtonLoading: { padding: "5px 10px", background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "wait", fontFamily: "inherit" },
  acceptButton: { padding: "5px 10px", background: "#16a34a", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  acceptButtonDone: { padding: "5px 10px", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "default", fontFamily: "inherit" },
  rejectButton: { padding: "5px 10px", background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  rejectButtonDone: { padding: "5px 10px", background: "#fee2e2", color: "#7f1d1d", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  rejectFormRow: { gridColumn: "1 / -1", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 },
  rejectTextarea: { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical" as const },
  rejectFormActions: { display: "flex", justifyContent: "flex-end", gap: 6 },
  cancelButton: { padding: "5px 12px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  confirmRejectButton: { padding: "5px 12px", background: "#dc2626", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  pillBase: { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  pillGreen: { background: "#dcfce7", color: "#166534" },
  pillAmber: { background: "#fef3c7", color: "#854d0e" },
  pillRed:   { background: "#fee2e2", color: "#991b1b" },

  countPillBase: { padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 },

  ocrBase: { padding: "1px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  ocrGreen: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
  ocrRed:   { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" },
  ocrBlue:  { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
};

// BF_PORTAL_BLOCK_v192_REOCR_BUTTON_v1
// Re-enqueue OCR for every document on this application. Shown inline in the
// Documents tab header. Uses the v210 server endpoint /reocr.
export function ReocrToolbar({ applicationId }: { applicationId?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!applicationId) return null;

  const onClick = async () => {
    setBusy(true);
    setResult(null);
    try {
      const data = await api.post<any>(
        `/api/portal/applications/${applicationId}/reocr`,
        {},
      );
      const total = Number(data?.totalDocs ?? 0);
      const enq = Number(data?.enqueued ?? 0);
      const failed = Number(data?.failed ?? 0);
      if (failed > 0 && Array.isArray(data?.errors) && data.errors.length > 0) {
        setResult(`Enqueued ${enq}/${total}, ${failed} failed: ${data.errors[0]?.error ?? "unknown"}`);
      } else {
        setResult(`Enqueued ${enq}/${total} documents. Watch Azure log stream for OCR results.`);
      }
    } catch (err: any) {
      setResult(`Failed: ${(err && err.message) || String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "8px 12px", marginBottom: 12,
      background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6,
    }}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        style={{
          padding: "6px 12px", fontSize: 13, fontWeight: 500,
          background: busy ? "#cbd5e1" : "#0ea5e9", color: "white",
          border: "none", borderRadius: 4, cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Enqueueing…" : "Re-run OCR on all documents"}
      </button>
      {result ? (
        <span style={{ fontSize: 12, color: "#475569" }}>{result}</span>
      ) : (
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          Forces fresh OCR jobs for every document on this application.
        </span>
      )}
    </div>
  );
}

