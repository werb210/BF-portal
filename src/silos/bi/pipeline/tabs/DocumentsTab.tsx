// BI_PIPELINE_ALIGN_v57 — Documents tab with Accept/Reject actions.
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
import type { BiStageId } from "../biStages";
type Doc = { id: string; file_name: string; status: "pending" | "accepted" | "rejected" };
export default function DocumentsTab({ applicationId, stage, onMutated }: { applicationId: string; stage: BiStageId; onMutated: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const load = useCallback(async () => { const r = await api<{ documents: Doc[] }>(`/api/v1/bi/applications/${applicationId}/documents`); setDocs(r.documents); }, [applicationId]);
  useEffect(() => { void load(); }, [load]);
  const reviewLocked = stage !== "under_review" && stage !== "documents_pending";
  async function accept(docId: string) { try { await api(`/api/v1/bi/applications/${applicationId}/documents/${docId}/accept`, { method: "POST" }); toast.success("Accepted"); await load(); onMutated(); } catch (e) { toast.error(e instanceof Error ? e.message : "Accept failed"); } }
  return <div className="space-y-2">{docs.map((d) => <div key={d.id} className="flex justify-between rounded border border-white/10 p-2"><span>{d.file_name}</span><button disabled={reviewLocked} onClick={() => accept(d.id)} className="rounded bg-emerald-600/80 px-2">Accept</button></div>)}</div>;
}
