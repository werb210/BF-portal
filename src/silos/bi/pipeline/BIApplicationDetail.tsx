// BF_PORTAL_BLOCK_BI_ROUND8_DETAIL_v1 -- 5-tab BI application
// detail per ruling 22: Application / Documents / Requirements /
// Requirement History / PGI Comms. Source-type-aware controls.
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import { biStageLabel, biStageBadgeClass, type BiStageId } from "./biStages";
import ApplicationTab from "./tabs/ApplicationTab";
import DocumentsTab from "./tabs/DocumentsTab";
import RequirementsTab from "./tabs/RequirementsTab";
import RequirementHistoryTab from "./tabs/RequirementHistoryTab";
import PgiCommsTab from "./tabs/PgiCommsTab";

type TabKey = "application" | "documents" | "requirements" | "history" | "pgi";

const TABS: { key: TabKey; label: string }[] = [
  { key: "application", label: "Application" },
  { key: "documents", label: "Documents" },
  { key: "requirements", label: "Requirements" },
  { key: "history", label: "Requirement History" },
  { key: "pgi", label: "PGI Comms" },
];

export type BiApplicationDetailData = {
  id: string;
  stage: BiStageId | string;
  source_type: "public" | "lender" | "referrer";
  guarantor_name: string;
  guarantor_email: string;
  business_name: string;
  lender_name: string | null;
  created_by_lender_user_id?: string | null;
  data: Record<string, unknown>;
  insurer_response?: Record<string, unknown>;
  docs_review_required: boolean;
  all_docs_accepted: boolean;
  submission_locked: boolean;
  is_demo?: boolean | null;
  application_code?: string | null;
  loan_amount?: number | null;
  pgi_limit?: number | null;
  carrier_received_at?: string | null;
  carrier_last_event?: string | null;
  carrier_last_event_at?: string | null;
  pgi_application_id?: string | null;
  carrier_submission_request?: Record<string, unknown> | null;
  carrier_submission_response?: Record<string, unknown> | null;
  carrier_submission_error?: string | null;
  annual_premium?: number | string | null;
  quote_id?: string | null;
  underwriter_ref?: string | null;
  score_reason?: string | null;
  policy_id?: string | null;
  policy_bound_at?: string | null;
  quote_valid_until?: string | null;
};

function tabFromQuery(raw: string | null): TabKey {
  switch (raw) {
    case "documents":
      return "documents";
    case "requirements":
      return "requirements";
    case "history":
      return "history";
    case "pgi":
      return "pgi";
    default:
      return "application";
  }
}

export default function BIApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => tabFromQuery(params.get("tab")));
  const [app, setApp] = useState<BiApplicationDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api<BiApplicationDetailData>(`/api/v1/bi/applications/${id}`);
      setApp(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load application");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectTab = (next: TabKey) => {
    setTab(next);
    if (next === "application") params.delete("tab");
    else params.set("tab", next);
    setParams(params, { replace: true });
  };

  if (error) {
    return (
      <div className="p-6 text-white">
        <p className="text-red-300">{error}</p>
        <button onClick={() => navigate("/silo/bi/pipeline")} className="mt-3 text-xs text-white/60 hover:text-white">
          ← Back to pipeline
        </button>
      </div>
    );
  }
  if (!app) return <div className="p-6 text-white/70">Loading…</div>;

  const isReadOnly = app.source_type === "lender" || app.source_type === "referrer";
  const sourceLabel =
    app.source_type === "lender"
      ? `Lender-submitted${app.lender_name ? ` (${app.lender_name})` : ""}`
      : app.source_type === "referrer"
        ? "Referrer-submitted"
        : "Public application";

  return (
    <div className="text-white">
      <header className="mb-6">
        <button onClick={() => navigate("/silo/bi/pipeline")} className="text-xs text-white/60 hover:text-white">
          ← Back to pipeline
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{app.business_name || "Untitled"}</h2>
          {app.is_demo === true && (
            <span className="rounded border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs tracking-wider text-amber-200">TEST</span>
          )}
          {app.application_code && <span className="font-mono text-xs text-white/40">{app.application_code}</span>}
          {isReadOnly && (
            <span className="rounded border border-slate-500/30 bg-slate-500/20 px-2 py-0.5 text-xs text-slate-200">View-only (auto-forwarded)</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/70">
          <span>{app.guarantor_name}</span>
          <span>•</span>
          <span>{sourceLabel}</span>
          <span>•</span>
          <span className={`rounded px-2 py-0.5 text-xs ${biStageBadgeClass(app.stage)}`}>{biStageLabel(app.stage)}</span>
          {app.submission_locked && <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-200">Locked</span>}
          {app.carrier_received_at && (
            <span className="rounded border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-xs text-blue-200">
              Received by carrier {new Date(app.carrier_received_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </header>

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            className={`whitespace-nowrap px-4 py-2 text-sm transition ${
              tab === t.key ? "border-b-2 border-blue-400 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section>
        {tab === "application" && <ApplicationTab app={app} onMutated={load} readOnly={isReadOnly} />}
        {tab === "documents" && (
          <DocumentsTab
            applicationId={app.id}
            stage={app.stage as BiStageId}
            onMutated={load}
            isStartup={Boolean((app.data as { is_startup?: boolean })?.is_startup)}
            readOnly={isReadOnly}
          />
        )}
        {tab === "requirements" && <RequirementsTab applicationId={app.id} sourceType={app.source_type} readOnly={isReadOnly} />}
        {tab === "history" && <RequirementHistoryTab applicationId={app.id} />}
        {tab === "pgi" && <PgiCommsTab app={app} />}
      </section>
    </div>
  );
}
