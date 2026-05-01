// BI_PIPELINE_ALIGN_v57 — Documents tab with Accept/Reject actions.
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
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
};

export default function DocumentsTab({ applicationId, stage, onMutated }: { applicationId: string; stage: BiStageId; onMutated: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const load = useCallback(async () => {
    const r = await api<{ documents: Doc[] }>(`/api/v1/bi/applications/${applicationId}/documents`);
    setDocs(r.documents);
  }, [applicationId]);
  useEffect(() => {
    void load();
  }, [load]);
  const reviewLocked = stage !== "under_review" && stage !== "documents_pending";
  async function accept(docId: string) {
    try {
      await api(`/api/v1/bi/applications/${applicationId}/documents/${docId}/accept`, { method: "POST" });
      toast.success("Accepted");
      await load();
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Accept failed");
    }
  }

  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <div key={d.id} className="flex justify-between rounded border border-white/10 p-2">
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {biDocSlotLabel(d.doc_slot ?? d.doc_type)}
              {biDocSlotIsCarrierBound(d.doc_slot ?? d.doc_type) === false && (
                <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">KYC only</span>
              )}
            </div>
            <div className="text-xs text-white/60">
              {d.file_name}
              {d.period_end && <span> • period ending {d.period_end}</span>}
            </div>
          </div>
          <button disabled={reviewLocked} onClick={() => accept(d.id)} className="rounded bg-emerald-600/80 px-2">
            Accept
          </button>
        </div>
      ))}
    </div>
  );
}
