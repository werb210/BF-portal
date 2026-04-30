// BI_PIPELINE_ALIGN_v57 — BI application card with 4 tabs.
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/api";
import { biStageLabel, biStageBadgeClass, type BiStageId } from "./biStages";
import ApplicationTab from "./tabs/ApplicationTab";
import DocumentsTab from "./tabs/DocumentsTab";
import InsurerResponseTab from "./tabs/InsurerResponseTab";
import NotesTab from "./tabs/NotesTab";

type TabKey = "application" | "documents" | "insurer" | "notes";
const TABS: { key: TabKey; label: string }[] = [
  { key: "application", label: "Application" },
  { key: "documents", label: "Documents" },
  { key: "insurer", label: "Insurer Response" },
  { key: "notes", label: "Notes" },
];

export type BiApplicationDetailData = { id: string; stage: BiStageId; source_type: "public" | "lender"; guarantor_name: string; guarantor_email: string; business_name: string; lender_name: string | null; data: Record<string, unknown>; insurer_response?: Record<string, unknown>; docs_review_required: boolean; all_docs_accepted: boolean; submission_locked: boolean; };

export default function BIApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("application");
  const [app, setApp] = useState<BiApplicationDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { const r = await api<BiApplicationDetailData>(`/api/v1/bi/applications/${id}`); setApp(r); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load application"); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  if (error) return <div className="p-6 text-white"><p className="text-red-300">{error}</p></div>;
  if (!app) return <div className="p-6 text-white/70">Loading…</div>;

  return <div className="text-white"><header className="mb-6"><button onClick={() => navigate("/silo/bi/pipeline")} className="text-xs text-white/60 hover:text-white">← Back to pipeline</button><h2 className="mt-2 text-2xl font-semibold">{app.business_name || "Untitled"}</h2><div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/70"><span>{app.guarantor_name}</span><span>•</span><span>{app.source_type === "lender" ? "Lender-submitted" : "Public application"}</span><span>•</span><span className={`rounded px-2 py-0.5 text-xs ${biStageBadgeClass(app.stage)}`}>{biStageLabel(app.stage)}</span>{app.submission_locked && <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-200">Locked</span>}</div></header><nav className="mb-4 flex gap-1 border-b border-white/10">{TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm transition ${tab === t.key ? "border-b-2 border-blue-400 text-white" : "text-white/60 hover:text-white"}`}>{t.label}</button>)}</nav><section>{tab === "application" && <ApplicationTab app={app} onMutated={load} />}{tab === "documents" && <DocumentsTab applicationId={app.id} stage={app.stage} onMutated={load} />}{tab === "insurer" && <InsurerResponseTab app={app} />}{tab === "notes" && <NotesTab applicationId={app.id} />}</section></div>;
}
