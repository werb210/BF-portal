// BF_PORTAL_BLOCK_v193_BI_SILO_ALIGN_v1
// Pipeline view aligned with the columns BI-Server v233 actually returns
// from /api/v1/bi/applications:
//   business_name, company_name, guarantor_name, loan_amount, pgi_limit,
//   lender_name, source, is_demo, application_code, public_id,
//   carrier_received_at, carrier_last_event, pgi_application_id.
//
// Adds two top-level filters:
//   - "Hide demo" toggle  → ?hide_demo=true
//   - Lender dropdown     → ?lender_id=<uuid>
//
// Cards now show: business/company name, guarantor, lender, loan amount,
// a TEST chip when is_demo, and a carrier chip when carrier_received_at
// or carrier_last_event is set so staff can see at a glance which rows
// have made it to the carrier.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

type BIApplication = {
  id: string;
  public_id?: string;
  application_code?: string | null;
  stage: string;
  source?: "public" | "lender" | string | null;
  business_name?: string | null;
  company_name?: string | null;
  guarantor_name?: string | null;
  lender_name?: string | null;
  loan_amount?: number | null;
  pgi_limit?: number | null;
  is_demo?: boolean | null;
  carrier_received_at?: string | null;
  carrier_last_event?: string | null;
  pgi_application_id?: string | null;
  bankruptcy_flag?: boolean;
  primary_contact_name?: string;
};

type Lender = { id: string; company_name: string; is_active?: boolean };

const STAGES = [
  { id: "new_application",    label: "New" },
  { id: "in_progress",        label: "In Progress" },
  { id: "document_review",    label: "Doc Review" },
  { id: "submitted",          label: "Submitted" },
  { id: "under_review",       label: "Under Review" },
  { id: "approved",           label: "Approved" },
  { id: "declined",           label: "Declined" },
  { id: "policy_issued",      label: "Policy Issued" },
];

function fmtMoney(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

export default function BIPipeline() {
  const [apps, setApps] = useState<BIApplication[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [hideDemo, setHideDemo] = useState<boolean>(() => {
    try { return localStorage.getItem("bi.pipeline.hide_demo") === "1"; } catch { return false; }
  });
  const [lenderId, setLenderId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    void loadLenders();
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideDemo, lenderId]);

  async function loadLenders() {
    try {
      const r = await api<{ lenders: Lender[] }>("/api/v1/bi/admin/lenders");
      setLenders((r.lenders || []).filter((l) => l.is_active !== false));
    } catch {
      setLenders([]);
    }
  }

  async function load() {
    const qs = new URLSearchParams();
    if (hideDemo) qs.set("hide_demo", "true");
    if (lenderId) qs.set("lender_id", lenderId);
    const path = `/api/v1/bi/applications${qs.toString() ? `?${qs}` : ""}`;
    try {
      const data = await api<BIApplication[] | { applications: BIApplication[] }>(path);
      const list = Array.isArray(data) ? data : data.applications || [];
      setApps(list);
    } catch {
      setApps([]);
    }
  }

  function onHideDemoChange(v: boolean) {
    setHideDemo(v);
    try { localStorage.setItem("bi.pipeline.hide_demo", v ? "1" : "0"); } catch {}
  }

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of apps) out[a.stage] = (out[a.stage] || 0) + 1;
    return out;
  }, [apps]);

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Pipeline</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={hideDemo}
              onChange={(e) => onHideDemoChange(e.target.checked)}
            />
            Hide demo
          </label>
          <select
            value={lenderId}
            onChange={(e) => setLenderId(e.target.value)}
            className="rounded border border-card bg-brand-surface px-2 py-1 text-white"
          >
            <option value="">All lenders</option>
            {lenders.map((l) => (
              <option key={l.id} value={l.id}>{l.company_name}</option>
            ))}
          </select>
          <button onClick={() => void load()} className="rounded border border-card px-3 py-1 text-white/70 hover:text-white">
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
        {STAGES.map((stage) => (
          <div key={stage.id} className="bg-brand-bgAlt border border-card rounded-xl p-3">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xs uppercase tracking-widest text-white/70">{stage.label}</h3>
              <span className="text-xs text-white/40">{counts[stage.id] || 0}</span>
            </div>
            <div className="space-y-2">
              {apps
                .filter((a) => a.stage === stage.id)
                .map((app) => {
                  const company = app.business_name || app.company_name || app.primary_contact_name || "Untitled";
                  const amount  = fmtMoney(app.loan_amount);
                  const carrierChip = app.carrier_last_event || (app.carrier_received_at ? "received" : null);
                  return (
                    <div
                      key={app.id}
                      onClick={() => navigate(`/silo/bi/pipeline/${app.id}`)}
                      className="bg-brand-surface border border-card rounded-lg p-3 cursor-pointer hover:border-blue-400/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <strong className="text-sm">{company}</strong>
                            {app.is_demo === true && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] tracking-wider text-amber-200 border border-amber-500/30">TEST</span>
                            )}
                          </div>
                          {app.guarantor_name && (
                            <div className="text-xs text-white/60 truncate">{app.guarantor_name}</div>
                          )}
                          {app.lender_name && (
                            <div className="text-[10px] text-white/40 truncate mt-0.5">via {app.lender_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                        {amount && <span className="text-white/80">{amount}</span>}
                        {carrierChip && (
                          <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-200 border border-blue-500/30">
                            carrier: {carrierChip}
                          </span>
                        )}
                        {app.bankruptcy_flag && (
                          <span className="text-[10px] text-brand-accent">⚠ Bankruptcy</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {(counts[stage.id] || 0) === 0 && (
                <div className="text-xs text-white/30 italic py-2 text-center">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
