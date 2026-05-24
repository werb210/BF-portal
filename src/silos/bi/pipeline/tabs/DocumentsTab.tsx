// BI_PIPELINE_ALIGN_v57 — Documents tab with Accept/Reject actions.
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { api, apiForSilo } from "@/api";
// BF_PORTAL_BLOCK_1_22_BI_DOC_UI — required-doc catalog.
import { fetchRequiredDocs, type BiRequiredDoc } from "@/silos/bi/api/biRequiredDocs";
import type { BiStageId } from "../biStages";
import { biDocSlotLabel, biDocSlotIsCarrierBound } from "../biDocumentSlots"; // BI_DOC_LIST_v61

type Doc = {
  id: string;
  category?: string;
  doc_type?: string;
  doc_slot?: string | null; // BI_DOC_LIST_v61
  period_end?: string | null; // BI_DOC_LIST_v61
  file_name: string;
  status: "pending" | "accepted" | "rejected";
  ocr_status?: string | null;
};


async function biReviewDocument(applicationId: string, docId: string, decision: "accepted" | "rejected", reason?: string) {
  const biApi = apiForSilo("BI");
  return biApi<{ ok: boolean }>(`/api/v1/bi/applications/${applicationId}/documents/${docId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, reason: reason ?? null }),
  });
}

function OcrStatusBadge({ status }: { status: string | null | undefined }) {
  // BF_PORTAL_BLOCK_1_22_BI_DOC_UI — OCR status badge per document.
  if (!status || status === "pending") {
    return <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/70">Queued</span>;
  }
  if (status === "processing") {
    return <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-blue-200">Processing</span>;
  }
  if (status === "complete") {
    return <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">Indexed</span>;
  }
  if (status === "failed") {
    return <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-200">OCR failed</span>;
  }
  if (status === "skipped") {
    return <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/70">Stored only</span>;
  }
  return <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/70">{status}</span>;
}

// BF_PORTAL_BLOCK_BI_ROUND8_DETAIL_v1 -- accept readOnly prop. When
// true, accept/reject controls are hidden (lender + referrer apps
// auto-forward to carrier and staff don't touch documents).
export default function DocumentsTab({ applicationId, stage: _stage, onMutated, isStartup = false, readOnly = false }: { readOnly?: boolean; applicationId: string; stage: BiStageId; onMutated: () => void; isStartup?: boolean }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  // BF_PORTAL_BLOCK_1_22_BI_DOC_UI — load required docs from server.
  const [requiredDocs, setRequiredDocs] = useState<BiRequiredDoc[]>([]);
  const [requiredDocsError, setRequiredDocsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ documents: Doc[] }>(`/api/v1/bi/applications/${applicationId}/documents`);
    setDocs(r.documents);
  }, [applicationId]);
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetchRequiredDocs()
      .then((fetchedDocs) => {
        if (!cancelled) setRequiredDocs(fetchedDocs);
      })
      .catch((err) => {
        if (!cancelled) {
          setRequiredDocsError(err instanceof Error ? err.message : "Failed to load required documents");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleDocs = requiredDocs
    .filter((d) => !d.if_startup || isStartup)
    .sort((a, b) => a.sort_order - b.sort_order);

  // BF_PORTAL_BLOCK_v212_BI_DOCUMENTS_TAB_FIX_v2
  // The previous URL was a 4-segment child path under /applications/...
  // which doesn't match any BI-Server route. The doc-accept handler
  // is mounted at /api/v1/bi/documents/:id/accept (already used
  // correctly by BIDocumentList). applicationId stays in the prop for
  // the docs list call but is dropped from the accept URL.
  async function accept(docId: string) {
    try {
      await biReviewDocument(applicationId, docId, "accepted");
      toast.success("Accepted");
      await load();
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Accept failed");
    }
  }

  async function reject(docId: string, docName: string) {
    const reason = window.prompt(`Reason for rejecting ${docName}?`);
    if (!reason || !reason.trim()) return;
    try {
      await biReviewDocument(applicationId, docId, "rejected", reason.trim());
      toast.success("Rejected");
      await load();
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    }
  }

  async function view(docId: string) {
    try {
      const r = await api<{ url?: string }>(`/api/v1/bi/documents/${docId}/file-url`);
      if (r.url) {
        window.open(r.url, "_blank", "noopener,noreferrer");
        return;
      }
      window.open(`/api/v1/bi/documents/${docId}/file-url`, "_blank", "noopener,noreferrer");
    } catch {
      window.open(`/api/v1/bi/documents/${docId}/file-url`, "_blank", "noopener,noreferrer");
    }
  }

  async function del(docId: string) {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try {
      await api(`/api/v1/bi/documents/${docId}`, { method: "DELETE" });
      toast.success("Deleted");
      await load();
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-white/10 p-3">
        <div className="mb-2 text-sm font-semibold">Required documents</div>
        {requiredDocsError && <div className="mb-2 text-xs text-red-300">{requiredDocsError}</div>}
        {/* BF_PORTAL_BLOCK_v620_BI_DOCS_INLINE_v1 — surface View/Accept/Reject
            inline per requirement row. */}
        <div className="space-y-2">
          {visibleDocs.map((rd) => {
            const uploaded = docs.find((dd) => (dd.doc_slot ?? dd.doc_type) === rd.doc_type);
            return (
              <div key={rd.doc_type} className="rounded border border-white/10 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {rd.display_label}
                      {uploaded?.status === "accepted" && (
                        <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">Accepted</span>
                      )}
                      {uploaded?.status === "rejected" && (
                        <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-200">Rejected</span>
                      )}
                      {!uploaded && (
                        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">Awaiting upload</span>
                      )}
                    </div>
                    {rd.description && <div className="text-xs text-white/60">{rd.description}</div>}
                    {uploaded?.file_name && (
                      <div className="mt-1 text-xs text-white/70">📄 {uploaded.file_name}</div>
                    )}
                  </div>
                  {!readOnly && uploaded && (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => void view(uploaded.id)} className="rounded bg-white/10 px-2 py-1 text-xs">View</button>
                      <button disabled={uploaded.status === "accepted"} onClick={() => accept(uploaded.id)} className="rounded bg-emerald-600/80 px-2 py-1 text-xs disabled:opacity-50">Accept</button>
                      <button disabled={uploaded.status === "rejected"} onClick={() => reject(uploaded.id, uploaded.file_name)} className="rounded bg-amber-600/80 px-2 py-1 text-xs disabled:opacity-50">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BF_PORTAL_BLOCK_v623_MEGAFIX_v1 — filter out docs already shown
          in the Required-documents section above. */}
      {docs
        .filter((d) => !visibleDocs.some((rd) => rd.doc_type === (d.doc_slot ?? d.doc_type)))
        .map((d) => (
        <div key={d.id} className="flex justify-between rounded border border-white/10 p-2">
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {biDocSlotLabel(d.doc_slot ?? d.doc_type)}
              <OcrStatusBadge status={d.ocr_status} />
              {biDocSlotIsCarrierBound(d.doc_slot ?? d.doc_type) === false && (
                <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">KYC only</span>
              )}
            </div>
            <div className="text-xs text-white/60">
              {d.file_name}
              {d.period_end && <span> • period ending {d.period_end}</span>}
            </div>
          </div>
          {!readOnly && (
            <div className="flex shrink-0 gap-1">
              <button onClick={() => void view(d.id)} className="rounded bg-white/10 px-2 text-xs">View</button>
              {/* BF_PORTAL_BLOCK_v309_BI_DOCS_UNLOCK_STAGE_v1 — operator
                  directive: Accept/Reject enabled at every stage. Stage-based
                  gating removed; per-doc status still gates the button for its
                  own action (can't re-accept an already-accepted doc). */}
              <button disabled={d.status === "accepted"} onClick={() => accept(d.id)} className="rounded bg-emerald-600/80 px-2 text-xs disabled:opacity-50">Accept</button>
              <button disabled={d.status === "rejected"} onClick={() => reject(d.id, d.file_name)} className="rounded bg-amber-600/80 px-2 text-xs disabled:opacity-50">Reject</button>
              <button onClick={() => del(d.id)} className="rounded bg-red-600/80 px-2 text-xs">Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
