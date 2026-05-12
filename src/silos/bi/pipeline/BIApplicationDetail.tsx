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

export type BiApplicationDetailData = { id: string; stage: BiStageId; source_type: "public" | "lender"; guarantor_name: string; guarantor_email: string; business_name: string; lender_name: string | null; created_by_lender_user_id?: string | null; /* BF_PORTAL_BLOCK_v199_LENDER_USERS_v1 */ data: Record<string, unknown>; insurer_response?: Record<string, unknown>; docs_review_required: boolean; all_docs_accepted: boolean; submission_locked: boolean; is_demo?: boolean | null; application_code?: string | null; loan_amount?: number | null; pgi_limit?: number | null; carrier_received_at?: string | null; carrier_last_event?: string | null; carrier_last_event_at?: string | null; pgi_application_id?: string | null; carrier_submission_request?: Record<string, unknown> | null; carrier_submission_response?: Record<string, unknown> | null; carrier_submission_error?: string | null; annual_premium?: number | string | null; quote_id?: string | null; underwriter_ref?: string | null; score_reason?: string | null; policy_id?: string | null; policy_bound_at?: string | null; quote_valid_until?: string | null; }; // BF_PORTAL_BLOCK_v193_BI_SILO_ALIGN_v2 // BF_PORTAL_BLOCK_v196_UNDERWRITING_BANNER_v1

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

  return <div className="text-white"><header className="mb-6"><button onClick={() => navigate("/silo/bi/pipeline")} className="text-xs text-white/60 hover:text-white">← Back to pipeline</button><div className="mt-2 flex items-center gap-2 flex-wrap"><h2 className="text-2xl font-semibold">{app.business_name || "Untitled"}</h2>{app.is_demo === true && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200 border border-amber-500/30 tracking-wider">TEST</span>}{app.application_code && <span className="text-xs text-white/40 font-mono">{app.application_code}</span>}</div><div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/70"><span>{app.guarantor_name}</span><span>•</span><span>{app.source_type === "lender" ? `Lender-submitted${app.lender_name ? ` (${app.lender_name})` : ""}${app.created_by_lender_user_id ? ` \u2022 user ${String(app.created_by_lender_user_id).slice(0, 8)}` : ""}` : "Public application"}</span><span>•</span><span className={`rounded px-2 py-0.5 text-xs ${biStageBadgeClass(app.stage)}`}>{biStageLabel(app.stage)}</span>{app.submission_locked && <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-200">Locked</span>}{app.carrier_received_at && <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs text-blue-200 border border-blue-500/30">Received by carrier {new Date(app.carrier_received_at).toLocaleDateString()}</span>}</div>{!app.carrier_received_at && app.all_docs_accepted && !app.submission_locked && (<div className="mt-3"><button onClick={async () => {if (!confirm("Forward this application to the carrier (PGI)? This is irreversible.")) return;try { await api(`/api/v1/bi/application/${app.id}/submit-pgi`, { method: "POST" }); await load(); }catch (e) { alert(e instanceof Error ? e.message : "Forward failed"); }}} className="rounded-md bg-blue-500 hover:bg-blue-400 px-4 py-2 text-sm font-medium text-white">Forward to carrier →</button></div>)}</header><nav className="mb-4 flex gap-1 border-b border-white/10">{TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm transition ${tab === t.key ? "border-b-2 border-blue-400 text-white" : "text-white/60 hover:text-white"}`}>{t.label}</button>)}</nav><section>{tab === "application" && <ApplicationTab app={app} onMutated={load} />}{tab === "documents" && <DocumentsTab applicationId={app.id} stage={app.stage} onMutated={load} isStartup={Boolean((app.data as { is_startup?: boolean })?.is_startup)} />}{tab === "insurer" && <InsurerResponseTab app={app} />}{tab === "notes" && <NotesTab applicationId={app.id} />}</section></div>;
}
