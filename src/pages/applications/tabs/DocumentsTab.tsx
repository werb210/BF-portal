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

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
// BF_PORTAL_BLOCK_v189_TAB_FIXES_ROUNDUP_v1 — switched off the @/utils/api strict envelope wrapper
import { api } from "@/api";
import { tamperBadge, type TamperFields } from "./tamperBadges"; // BF_PORTAL_TAMPER_BADGES_v270
import { coverageHint, coverageTone, parseBankCoverage, type BankCoverage } from "./bankCoverage"; // BF_PORTAL_BANK_COVERAGE_v268
import { autoMovedText, misfiledBadgeText, type MisfiledFields } from "./misfiledBadges"; // BF_PORTAL_MISFILED_BADGES_v263
import { buildDuplicateIndex, duplicateBadgeText, extraCopyIds, parseDuplicateGroups, type DuplicateGroup, type DuplicateRef } from "./documentDuplicates"; // BF_PORTAL_DOCUMENT_DUPLICATE_BADGES_v259
import { apiBlob } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { canWrite } from "@/auth/can";
// BF_PORTAL_SPLIT_VIEW_v205
import DocumentSplitView, { type SplitViewDoc } from "@/components/applications/DocumentSplitView";
import AcceptNameDialog from "@/components/applications/AcceptNameDialog"; // BF_PORTAL_ACCEPT_NAME_v266

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
} & MisfiledFields & TamperFields & { displayName?: string | null }; // v263, v270

type PortalApplicationResponse = { documents?: DocumentRow[] };

// BF_PORTAL_BLOCK_v_DOC_FRAUD_SCAN_v1 — staff-triggered tamper scan UI. Calls the
// server analyzer (POST /api/portal/documents/:id/fraud-scan) and shows an explainable
// level badge + reasons. Signals only — never a verdict; staff decide.
type FraudSignal = { code: string; label: string; severity: "low" | "medium" | "high"; detail: string };
type FraudScanResult = { level: "clean" | "low" | "medium" | "high"; signals: FraudSignal[]; note: string | null; kind?: string; duplicateCount?: number };
type FraudScanState = { loading?: boolean; result?: FraudScanResult; error?: string };

export function fraudBadgeView(level: string | undefined): { label: string; bg: string; fg: string } {
  switch (level) {
    case "high": return { label: "High risk", bg: "#fee2e2", fg: "#991b1b" };
    case "medium": return { label: "Review", bg: "#fef3c7", fg: "#92400e" };
    case "low": return { label: "Low", bg: "var(--ui-surface-muted)", fg: "var(--ui-text-muted)" };
    case "clean": return { label: "No tamper signals", bg: "#dcfce7", fg: "#166534" };
    default: return { label: "Scan", bg: "var(--ui-border)", fg: "#334155" };
  }
}

function FraudScanRow({ scan, open, onToggle }: { scan: FraudScanState | undefined; open: boolean; onToggle: () => void }) {
  if (!scan) return null;
  if (scan.error) return <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>{scan.error}</div>;
  if (!scan.result) return null;
  const r = scan.result;
  const v = fraudBadgeView(r.level);
  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" onClick={onToggle} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: 0, cursor: "pointer", padding: 0 }} data-testid="doc-fraud-toggle">
        <span style={{ background: v.bg, color: v.fg, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }} data-testid="doc-fraud-badge">{v.label}</span>
        {r.signals.length > 0 ? <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{open ? "Hide" : "Show"} {r.signals.length} reason{r.signals.length === 1 ? "" : "s"}</span> : null}
      </button>
      {open ? (
        <div style={{ marginTop: 8, border: "1px solid var(--ui-border)", borderRadius: 8, padding: "10px 12px", background: "var(--ui-surface-muted)" }}>
          {r.signals.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No tamper signals found in the document metadata.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {r.signals.map((sig) => (
                // BF_PORTAL_TAMPER_CONTRAST_v30
                <li key={sig.code} style={{ fontSize: 13, marginBottom: 6, color: "var(--ui-text)", lineHeight: 1.45 }}>
                  <strong style={{ color: sig.severity === "high" ? "#991b1b" : sig.severity === "medium" ? "#92400e" : "var(--ui-text)" }}>{sig.label}</strong>
                  <span style={{ color: "var(--ui-text)" }}> — {sig.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {r.note ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--ui-text-muted)", fontStyle: "italic" }}>{r.note}</div> : null}
          {/* BF_PORTAL_TAMPER_CONTRAST_v30 - a disclaimer nobody can read is not a
              disclaimer. Muted, but deliberately above the panel's faintest tone. */}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ui-text-muted)", opacity: 1 }}>Signals for review only — not a verdict. Staff decide.</div>
        </div>
      ) : null}
    </div>
  );
}

const CATEGORY_GROUPS = [
  { id: "banking",     label: "Banking",              matches: (c: string) => /bank|statement/i.test(c) },
  { id: "financials",  label: "Financial Statements", matches: (c: string) => /financial|income|p_?l|profit|balance/i.test(c) },
  { id: "tax",         label: "Tax Documents",        matches: (c: string) => /tax|t1|t2|return/i.test(c) },
  { id: "legal",       label: "Legal & Corporate",    matches: (c: string) => /article|incorporation|bylaw|operating.?agreement|legal/i.test(c) },
  { id: "id",          label: "Identification",       matches: (c: string) => /\bid\b|driver|passport|license/i.test(c) },
];

// BF_PORTAL_BLOCK_v820_STAFF_UPLOAD — staff document category picker (exact labels, locked).
const STAFF_DOC_CATEGORIES: string[] = [
  "6 months business banking statements",
  "3 years accountant prepared financials",
  "3 years business tax returns",
  "PnL – Interim financials",
  "Balance Sheet – Interim financials",
  "A/R",
  "A/P",
  "2 pieces of Government Issued ID",
  "VOID cheque or PAD",
  "2 years personal tax returns (T1 generals)",
  "Corporate structure / org chart",
  "Business plan / projections",
  "Lease agreement (if applicable)",
  "Other",
];

export default function DocumentsTab({ applicationId }: Props) {
  const { user } = useAuth();
  const canManage = canWrite((user as { role?: string | null } | null)?.role ?? null);
  const isAdmin = ((user as { role?: string | null } | null)?.role ?? "") === "Admin";

  const [docs, setDocs]       = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [working, setWorking] = useState<Record<string, "accept" | "reject" | undefined>>({});
  const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptDoc, setAcceptDoc] = useState<{ documentId: string; filename: string | null; fromPane: boolean } | null>(null); // v266
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[]>([]); // v259
  const [bankCoverage, setBankCoverage] = useState<BankCoverage | null>(null); // v268
  const [removingCopies, setRemovingCopies] = useState(false); // v259
  // BF_PORTAL_BLOCK_v820_STAFF_UPLOAD
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCat, setUploadCat] = useState<string>(STAFF_DOC_CATEGORIES[0] ?? "Other");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const uploadFileRef = useRef<HTMLInputElement | null>(null);
  // BF_PORTAL_IPAD_WIRING_v238 - files dropped onto the tab (Finder, Files, Mail).
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const DROP_EXTS = [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"];
  function onDocumentsDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => DROP_EXTS.some((x) => f.name.toLowerCase().endsWith(x)));
    if (files.length === 0) return;
    setDroppedFiles(files);
    setUploadErr(null);
    setUploadOpen(true);
  }
  async function doStaffUpload() {
    // BF_PORTAL_STAFF_MULTI_UPLOAD_v1 — upload every selected file (all under
    // the same category), so e.g. all 6 months of bank statements go up at once.
    const files = droppedFiles.length > 0 ? droppedFiles : Array.from(uploadFileRef.current?.files ?? []);
    if (files.length === 0) { setUploadErr("Choose a file."); return; }
    if (!applicationId) { setUploadErr("No application."); return; }
    setUploading(true); setUploadErr(null);
    try {
      const failures: string[] = [];
      for (const file of files) {
        try {
          const fd = new FormData();
          fd.append("applicationId", applicationId);
          fd.append("category", uploadCat);
          fd.append("file", file);
          await api("/api/documents/upload", { method: "POST", body: fd });
        } catch (e: any) {
          failures.push(`${file.name}: ${e?.message ?? "upload failed"}`);
        }
      }
      if (uploadFileRef.current) uploadFileRef.current.value = "";
      setDroppedFiles([]);
      if (failures.length > 0) {
        setUploadErr(`${files.length - failures.length} of ${files.length} uploaded. Failed: ${failures.join("; ")}`);
      } else {
        setUploadOpen(false);
      }
      await reload();
    } catch (e: any) {
      setUploadErr(e?.message ?? "Upload failed");
    } finally { setUploading(false); }
  }
  // BF_PORTAL_BLOCK_v184_DOC_PREVIEW_WIRE_UP_v1
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});
  // BF_PORTAL_SPLIT_VIEW_v205
  const [splitDoc, setSplitDoc] = useState<SplitViewDoc | null>(null);
  // BF_PORTAL_BLOCK_v_DOC_FRAUD_SCAN_v1
  const [scan, setScan] = useState<Record<string, FraudScanState>>({});
  const [scanOpen, setScanOpen] = useState<Record<string, boolean>>({});
  const handleScan = useCallback(async (docId: string) => {
    setScan((s) => ({ ...s, [docId]: { loading: true } }));
    setScanOpen((o) => ({ ...o, [docId]: true }));
    try {
      const r = await api.post<FraudScanResult>(`/api/portal/documents/${docId}/fraud-scan`, {});
      setScan((s) => ({ ...s, [docId]: { result: r } }));
    } catch {
      setScan((s) => ({ ...s, [docId]: { error: "Scan failed — try again." } }));
    }
  }, []);

  async function handlePreview(docId: string, filename: string | null) {
    if (previewing[docId]) return;
    setPreviewing((p) => ({ ...p, [docId]: true }));
    setActionError(null);
    let objectUrl: string | null = null;
    try {
      const blob = await apiBlob(`/api/portal/documents/${docId}/file`);
      objectUrl = URL.createObjectURL(blob);
      // BF_PORTAL_SPLIT_VIEW_v205 - dock the preview beside the application.
      // BF_PORTAL_DOCUMENT_REVIEW_PANE_v261 - keep the bytes and document metadata for review.
      const row = docs.find((document) => document.documentId === docId);
      setSplitDoc((previous) => {
        if (previous?.url) URL.revokeObjectURL(previous.url);
        const notices = row ? [tamperBadge(row)?.text, misfiledBadgeText(row), autoMovedText(row)].filter((n): n is string => !!n) : []; // v270
        return { url: objectUrl as string, filename: row?.displayName ?? filename, mimeType: blob.type || null, blob, documentId: docId, status: row?.status ?? null, category: row?.category ?? null, notices };
      });
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
      setBankCoverage(parseBankCoverage(r)); // v268
      // BF_PORTAL_DOCUMENT_DUPLICATE_BADGES_v259 - an older server without the route just shows no badges.
      try {
        setDupGroups(parseDuplicateGroups(await api.get(`/api/documents/${applicationId}/duplicates`)));
      } catch {
        setDupGroups([]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { void reload(); }, [reload]);

  async function handleAccept(docId: string, displayName: string | null = null) {
    if (working[docId]) return;
    setWorking((w) => ({ ...w, [docId]: "accept" }));
    setActionError(null);
    try {
      await api.post(`/api/portal/documents/${docId}/accept`, displayName ? { displayName } : {});
      await reload();
      setAcceptDoc(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Accept failed");
    } finally {
      setWorking((w) => ({ ...w, [docId]: undefined }));
    }
  }

  async function confirmNamedAccept(displayName: string | null) {
    if (!acceptDoc) return;
    if (acceptDoc.fromPane) {
      const accepted = await reviewFromPane(acceptDoc.documentId, "accept", undefined, displayName);
      if (accepted) setAcceptDoc(null);
    } else {
      await handleAccept(acceptDoc.documentId, displayName);
    }
  }

  // BF_PORTAL_DOCUMENT_REVIEW_PANE_v261 - review from the preview, then advance.
  const reviewOrder = useMemo(() => groupAndSortDocs(docs).flatMap(([, group]) => group.docs), [docs]);
  function nextPendingAfter(docId: string): DocumentRow | null {
    const index = reviewOrder.findIndex((document) => document.documentId === docId);
    const after = [...reviewOrder.slice(index + 1), ...reviewOrder.slice(0, Math.max(0, index))];
    return after.find((document) => (document.status ?? "pending").toLowerCase() === "pending" && document.documentId !== docId) ?? null;
  }
  async function reviewFromPane(docId: string, action: "accept" | "reject", reason?: string, displayName: string | null = null) {
    if (working[docId]) return false;
    setWorking((value) => ({ ...value, [docId]: action }));
    setActionError(null);
    try {
      if (action === "accept") await api.post(`/api/portal/documents/${docId}/accept`, displayName ? { displayName } : {});
      else await api.post(`/api/portal/documents/${docId}/reject`, { reason });
      const next = nextPendingAfter(docId);
      await reload();
      if (next) await handlePreview(next.documentId, next.filename);
      else setSplitDoc((previous) => { if (previous?.url) URL.revokeObjectURL(previous.url); return null; });
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : action === "accept" ? "Accept failed" : "Reject failed");
      return false;
    } finally {
      setWorking((value) => ({ ...value, [docId]: undefined }));
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

  async function handleDelete(docId: string) {
    if (!applicationId) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this document permanently? This also removes the stored file.")) return;
    setActionError(null);
    try {
      await api.delete(`/api/documents/${applicationId}/documents/${docId}`); // BF_PORTAL_DOC_DELETE_PATH_v1 — server route is /api/documents/:appId/documents/:docId
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const grouped = useMemo(() => groupAndSortDocs(docs), [docs]);
  const counts = useMemo(() => countByStatus(docs), [docs]);
  // BF_PORTAL_DOCUMENT_DUPLICATE_BADGES_v259
  const duplicateOf = useMemo(() => buildDuplicateIndex(dupGroups), [dupGroups]);
  const copyIds = useMemo(() => extraCopyIds(dupGroups), [dupGroups]);
  async function removeDuplicateCopies() {
    if (!applicationId || copyIds.length === 0) return;
    if (typeof window !== "undefined" && !window.confirm(`Remove ${copyIds.length} duplicate cop${copyIds.length === 1 ? "y" : "ies"}? The first upload of each file is kept.`)) return;
    setRemovingCopies(true);
    setActionError(null);
    const failed: string[] = [];
    for (const id of copyIds) {
      try {
        await api.delete(`/api/documents/${applicationId}/documents/${id}`);
      } catch {
        failed.push(id);
      }
    }
    if (failed.length > 0) setActionError(`${copyIds.length - failed.length} of ${copyIds.length} duplicate copies removed. Try again for the rest.`);
    setRemovingCopies(false);
    await reload();
  }

  if (!applicationId) return <div style={styles.placeholder}>Select an application to view documents.</div>;
  if (loading)        return <div style={styles.placeholder}>Loading documents…</div>;
  if (error)          return <div style={styles.error}>{error}</div>;

  return (
    <div
      style={dragActive ? { ...styles.page, outline: "2px dashed var(--ui-accent-blue)", outlineOffset: 4 } : styles.page}
      onDragOver={(e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); setDragActive(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragActive(false); }}
      onDrop={onDocumentsDrop}
      data-testid="documents-drop-target"
    >
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
        <button type="button" onClick={() => { setUploadErr(null); setUploadOpen(true); }} style={{ background: "var(--ui-accent-blue)", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0, cursor: "pointer", whiteSpace: "nowrap" }} data-testid="staff-upload-document">{/* BF_PORTAL_BLOCK_v820_STAFF_UPLOAD */}Upload document</button>
      </header>
      {uploadOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setUploadOpen(false); setDroppedFiles([]); }}>
          <div style={{ background: "var(--ui-surface-strong)", borderRadius: 12, padding: 20, width: 460, maxWidth: "92vw", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ui-text)", marginBottom: 12 }}>Upload document</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)" }}>Category</label>
            <select value={uploadCat} onChange={(e) => setUploadCat(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", margin: "4px 0 12px", fontSize: 14 }}>
              {STAFF_DOC_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <input ref={uploadFileRef} type="file" multiple accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" style={{ display: "block", marginBottom: 12 }} />
            {droppedFiles.length > 0 && (
              <div style={{ fontSize: 13, color: "var(--ui-text)", marginBottom: 12 }} data-testid="dropped-files">
                {droppedFiles.length} dropped file{droppedFiles.length === 1 ? "" : "s"}: {droppedFiles.map((f) => f.name).join(", ")}
              </div>
            )}
            {uploadErr && <div style={{ color: "#b00020", fontSize: 13, marginBottom: 10 }} role="status">{uploadErr}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => { setUploadOpen(false); setDroppedFiles([]); }} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text-muted)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="button" disabled={uploading} onClick={() => void doStaffUpload()} style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "var(--ui-accent-blue)", color: "#fff", fontWeight: 600, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>{uploading ? "Uploading…" : "Upload"}</button>
            </div>
          </div>
        </div>
      )}

      {/* BF_PORTAL_BANK_COVERAGE_v268 */}
      {bankCoverage ? (() => {
        const tone = coverageTone(bankCoverage);
        const palette = tone === "complete"
          ? { bg: "#f0fdf4", border: "#86efac", fg: "#166534", icon: "✓" }
          : tone === "gaps"
            ? { bg: "#fef2f2", border: "#fca5a5", fg: "#991b1b", icon: "!" }
            : { bg: "#fffbeb", border: "#fcd34d", fg: "#92400e", icon: "?" };
        const hint = coverageHint(bankCoverage);
        return (
          <div role="status" data-testid="bank-coverage-banner" data-tone={tone} style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.fg, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{palette.icon} Bank statements: {bankCoverage.summary}</div>
            {hint ? <div style={{ marginTop: 4, fontWeight: 400 }}>{hint}</div> : null}
          </div>
        );
      })() : null}

      {copyIds.length > 0 && (
        <div role="status" data-testid="duplicate-copies-banner" style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>
          <span>
            {copyIds.length} duplicate cop{copyIds.length === 1 ? "y" : "ies"} on this application. Each file should be uploaded once, in the right place.
            {isAdmin ? "" : " Ask an admin to remove the extra copies."}
          </span>
          {isAdmin ? (
            <button type="button" disabled={removingCopies} onClick={() => void removeDuplicateCopies()}
              style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid #ea580c", background: "#fff", color: "#9a3412", fontWeight: 600, cursor: "pointer" }}>
              {removingCopies ? "Removing..." : "Remove duplicate copies"}
            </button>
          ) : null}
        </div>
      )}

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
                  onAccept={() => setAcceptDoc({ documentId: doc.documentId, filename: doc.filename, fromPane: false })}
                  onRejectOpen={() => setRejectOpen((r) => ({ ...r, [doc.documentId]: true }))}
                  onRejectCancel={() => {
                    setRejectOpen((r) => ({ ...r, [doc.documentId]: false }));
                    setRejectDraft((r) => ({ ...r, [doc.documentId]: "" }));
                  }}
                  onRejectChange={(v) => setRejectDraft((r) => ({ ...r, [doc.documentId]: v }))}
                  onRejectSubmit={() => handleReject(doc.documentId)}
                  isAdmin={isAdmin}
                  onDelete={() => handleDelete(doc.documentId)}
                  scan={scan[doc.documentId]}
                  scanOpen={!!scanOpen[doc.documentId]}
                  onScan={() => void handleScan(doc.documentId)}
                  onToggleScan={() => setScanOpen((o) => ({ ...o, [doc.documentId]: !o[doc.documentId] }))}
                  duplicateOf={duplicateOf[doc.documentId]}
                />
              ))}
            </div>
          </section>
        ))
      )}
      {/* BF_PORTAL_SPLIT_VIEW_v205 */}
      <DocumentSplitView
        doc={splitDoc}
        onClose={() => setSplitDoc((previous) => {
          if (previous?.url) URL.revokeObjectURL(previous.url);
          return null;
        })}
        review={splitDoc?.documentId && canManage ? {
          working: working[splitDoc.documentId],
          onAccept: () => setAcceptDoc({ documentId: splitDoc.documentId as string, filename: splitDoc.filename, fromPane: true }),
          onReject: (reason: string) => void reviewFromPane(splitDoc.documentId as string, "reject", reason),
          hasNext: !!nextPendingAfter(splitDoc.documentId),
          onNext: () => {
            const next = nextPendingAfter(splitDoc.documentId as string);
            if (next) void handlePreview(next.documentId, next.filename);
          },
        } : null}
      />
      {acceptDoc ? (
        <AcceptNameDialog
          documentId={acceptDoc.documentId}
          originalFilename={acceptDoc.filename}
          working={working[acceptDoc.documentId] === "accept"}
          onCancel={() => setAcceptDoc(null)}
          onConfirm={(displayName) => void confirmNamedAccept(displayName)}
        />
      ) : null}
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
  isAdmin: boolean;
  onDelete: () => void;
  scan: FraudScanState | undefined;
  scanOpen: boolean;
  onScan: () => void;
  onToggleScan: () => void;
  duplicateOf?: DuplicateRef; // v259
}) {
  const { doc, canManage, working, previewing, rejectOpen, rejectDraft } = props;
  const status = (doc.status ?? "pending").toLowerCase() as DocStatus;
  const isRejected = status === "rejected";
  const isAccepted = status === "accepted";
  // BF_PORTAL_BLOCK_v_DOC_NAME_CONTRAST_v1 — raw blob token (e.g. "att.kstL72...")
  // isn't a human name; when the filename looks like a storage blob, show the
  // category/title so staff see a meaningful label.
  function v_friendlyDocName(d: { filename: string | null; title: string | null; category: string | null }): string {
    const fn = (d.filename ?? "").trim();
    const looksBlob = !fn
      || /^att\./i.test(fn)
      || (!/\.[a-z0-9]{2,5}$/i.test(fn) && fn.length > 24)
      || /^[A-Za-z0-9_-]{24,}$/.test(fn);
    if (looksBlob) return (d.title || d.category || "Document").trim();
    return fn;
  }

  return (
    <div style={styles.docRow}>
      <div style={styles.docMain}>
        <div style={styles.docTopLine}>
          <span style={styles.filename}>{doc.displayName ?? v_friendlyDocName(doc)}</span>{doc.displayName && doc.filename && doc.displayName !== doc.filename ? <span data-testid="original-filename" style={{ fontSize: 12, color: "#6b7280" }}>({doc.filename})</span> : null}
          <StatusPill status={status} />
          <OcrBadge ocr={doc.ocrStatus} />
          {tamperBadge(doc) ? (
            <span data-testid="tamper-badge" data-tone={tamperBadge(doc)!.tone} title={tamperBadge(doc)!.detail}
              style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px", cursor: "help",
                color: tamperBadge(doc)!.tone === "high" ? "#991b1b" : "#92400e",
                background: tamperBadge(doc)!.tone === "high" ? "#fee2e2" : "#fef3c7",
                border: `1px solid ${tamperBadge(doc)!.tone === "high" ? "#fca5a5" : "#fcd34d"}` }}>
              {tamperBadge(doc)!.text}
            </span>
          ) : null}
          {misfiledBadgeText(doc) ? (
            <span data-testid="misfiled-badge" title="Server OCR thinks this document may be filed under the wrong requirement. Check before accepting." style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 6, padding: "2px 8px" }}>
              {misfiledBadgeText(doc)}
            </span>
          ) : null}
          {autoMovedText(doc) ? (
            <span data-testid="auto-moved-badge" style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, padding: "2px 8px" }}>
              {autoMovedText(doc)}
            </span>
          ) : null}
          {props.duplicateOf ? (
            <span data-testid="duplicate-badge" style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", background: "#ffedd5", border: "1px solid #fdba74", borderRadius: 6, padding: "2px 8px" }}>
              {duplicateBadgeText(props.duplicateOf)}
            </span>
          ) : null}
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
        <button
          type="button"
          onClick={props.onScan}
          disabled={props.scan?.loading}
          title="Check this document's metadata for tamper signals"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, fontWeight: 600, cursor: props.scan?.loading ? "default" : "pointer" }}
          data-testid="doc-fraud-scan"
        >
          {props.scan?.loading ? "Scanning…" : "Scan for tampering"}
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
        {props.isAdmin && (
          <button
            type="button"
            onClick={props.onDelete}
            title="Permanently delete this document (admin only)"
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #dc2626", background: "var(--ui-surface-strong)", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Delete
          </button>
        )}
        <FraudScanRow scan={props.scan} open={props.scanOpen} onToggle={props.onToggleScan} />
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
  placeholder: { padding: 24, color: "var(--ui-text-muted)" },
  error: { padding: 24, color: "#b91c1c" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, margin: 0, color: "var(--ui-text)" },
  subtitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ui-text-muted)", marginTop: 6, flexWrap: "wrap" as const },
  subtitleSep: { opacity: 0.4 },
  subtitleTotal: { color: "var(--ui-text)", fontWeight: 600 },
  actionError: { color: "#b91c1c", padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13 },
  emptyAll: { padding: 24, color: "var(--ui-text-muted)", fontStyle: "italic", textAlign: "center", border: "1px dashed var(--ui-border)", borderRadius: 8 },

  section: { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: "12px 16px 4px", marginBottom: 12, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" },
  sectionTitle: { fontSize: 12, fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border-soft)", paddingBottom: 8 },
  sectionCount: { marginLeft: 8, color: "var(--ui-text-muted)", fontSize: 12, fontWeight: 600 },
  docList: { display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12 },

  docRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: "10px 12px", border: "1px solid var(--ui-border)", borderRadius: 8, alignItems: "center", background: "var(--ui-surface-strong)" },
  docMain: { minWidth: 0 },
  docTopLine: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
  filename: { fontWeight: 600, color: "var(--ui-text)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 380 },
  docMeta: { fontSize: 12, color: "var(--ui-text-muted)", marginTop: 4 },
  categoryTag: { background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 11 },
  rejectionReason: { marginTop: 8, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#7f1d1d" },

  docActions: { display: "flex", gap: 6, alignItems: "center" },
  previewButtonDisabled: { padding: "5px 10px", background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "not-allowed", fontFamily: "inherit" },
  // BF_PORTAL_BLOCK_v184_DOC_PREVIEW_WIRE_UP_v1
  previewButton: { padding: "5px 10px", background: "var(--ui-surface-strong)", color: "var(--ui-accent-blue)", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  previewButtonLoading: { padding: "5px 10px", background: "rgba(47, 168, 106, 0.12)", color: "var(--ui-accent-blue)", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "wait", fontFamily: "inherit" },
  acceptButton: { padding: "5px 10px", background: "#16a34a", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  acceptButtonDone: { padding: "5px 10px", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "default", fontFamily: "inherit" },
  rejectButton: { padding: "5px 10px", background: "var(--ui-surface-strong)", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  rejectButtonDone: { padding: "5px 10px", background: "#fee2e2", color: "#7f1d1d", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  rejectFormRow: { gridColumn: "1 / -1", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 },
  rejectTextarea: { width: "100%", padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical" as const },
  rejectFormActions: { display: "flex", justifyContent: "flex-end", gap: 6 },
  cancelButton: { padding: "5px 12px", background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  confirmRejectButton: { padding: "5px 12px", background: "#dc2626", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  pillBase: { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  pillGreen: { background: "#dcfce7", color: "#166534" },
  pillAmber: { background: "#fef3c7", color: "#854d0e" },
  pillRed:   { background: "#fee2e2", color: "#991b1b" },

  countPillBase: { padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 },

  ocrBase: { padding: "1px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  ocrGreen: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
  ocrRed:   { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" },
  ocrBlue:  { background: "rgba(47, 168, 106, 0.12)", color: "var(--ui-accent-blue)", border: "1px solid #bfdbfe" },
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
      background: "var(--ui-surface-muted)", border: "1px solid var(--ui-border)", borderRadius: 6,
    }}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        style={{
          padding: "6px 12px", fontSize: 13, fontWeight: 500,
          background: busy ? "var(--ui-border)" : "var(--ui-accent-blue)", color: "white", /* v_BUTTON_ACCENT_v1 — was cyan */
          border: "none", borderRadius: 4, cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Enqueueing…" : "Re-run OCR on all documents"}
      </button>
      {result ? (
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{result}</span>
      ) : (
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
          Forces fresh OCR jobs for every document on this application.
        </span>
      )}
    </div>
  );
}
