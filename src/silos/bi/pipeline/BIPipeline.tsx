// BF_PORTAL_BLOCK_BI_ROUND8_PIPELINE_v1 -- BI pipeline aligned to
// the 10-stage spec with the BI-specific filter set:
//   Search / Stage / Source / Carrier event / From / To / Sort
// Replaces the BF-leftover filters (Product Type, Submission Method,
// Lender Assigned, Lender Status) and BF column taxonomy that were
// rendering in the BI silo via PipelinePage.
//
// Cards click through to /silo/bi/pipeline/:id (BIApplicationDetail).
// Demo applications are always hidden from staff per ruling.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import {
  BI_VISIBLE_PIPELINE_STAGES,
  biStageLabel,
  resolveStageId,
  type BiStageId,
} from "./biStages";

type Source = "public" | "lender" | "referrer";
type CarrierEvent = "quoted" | "declined" | "info_required" | "policy_bound" | "none";
type Sort = "updated_desc" | "updated_asc" | "amount_desc" | "amount_asc";

type BIApplication = {
  id: string;
  public_id?: string;
  application_code?: string | null;
  stage: string;
  source?: Source | string | null;
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
  updated_at?: string | null;
  docs_reminder_count?: number | null;
  docs_reminder_escalated?: boolean | null;
};

type Filters = {
  q: string;
  stage: "" | BiStageId;
  source: "" | Source;
  carrier: "" | CarrierEvent;
  from: string;
  to: string;
  sort: Sort;
  // BF_PORTAL_BLOCK_54_BI_DETAIL_OWNERSHIP_DEMO_v1 — show_demo toggle. Default false (demo hidden).
  show_demo: boolean;
};

const EMPTY: Filters = { q: "", stage: "", source: "", carrier: "", from: "", to: "", sort: "updated_desc", show_demo: false };

function fmtMoney(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

function readFiltersFromUrl(p: URLSearchParams): Filters {
  return {
    q: p.get("q") || "",
    stage: (p.get("stage") as BiStageId | null) || "",
    source: (p.get("source") as Source | null) || "",
    carrier: (p.get("carrier") as CarrierEvent | null) || "",
    from: p.get("from") || "",
    to: p.get("to") || "",
    sort: (p.get("sort") as Sort | null) || "updated_desc",
    // BF_PORTAL_BLOCK_54_BI_DETAIL_OWNERSHIP_DEMO_v1
    show_demo: p.get("show_demo") === "1",
  };
}

export default function BIPipeline() {
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => readFiltersFromUrl(urlParams));
  const [apps, setApps] = useState<BIApplication[]>([]);

  // Sync URL <-> filter state for deep-linkable filtered views.
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.q)       next.set("q", filters.q);
    if (filters.stage)   next.set("stage", filters.stage);
    if (filters.source)  next.set("source", filters.source);
    if (filters.carrier) next.set("carrier", filters.carrier);
    if (filters.from)    next.set("from", filters.from);
    if (filters.to)      next.set("to", filters.to);
    if (filters.sort !== "updated_desc") next.set("sort", filters.sort);
    if (filters.show_demo) next.set("show_demo", "1");
    if (next.toString() !== urlParams.toString()) setUrlParams(next, { replace: true });
  }, [filters, urlParams, setUrlParams]);

  useEffect(() => { void load(); }, []);

  // BF_PORTAL_BLOCK_54_BI_DETAIL_OWNERSHIP_DEMO_v1 — refetch when toggle flips.
  useEffect(() => { void load(); }, [filters.show_demo]);

  async function load() {
    try {
      const url = filters.show_demo
        ? "/api/v1/bi/applications"
        : "/api/v1/bi/applications?hide_demo=true";
      const data = await api<BIApplication[] | { applications: BIApplication[] }>(url);
      const list = Array.isArray(data) ? data : data.applications || [];
      setApps(filters.show_demo ? list : list.filter((a) => a.is_demo !== true));
    } catch {
      setApps([]);
    }
  }

  // Client-side filter + sort. Server-side will follow once BI-Server
  // accepts the same query string -- the URL is intentionally aligned.
  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const fromMs = filters.from ? new Date(filters.from).getTime() : 0;
    const toMs   = filters.to   ? new Date(filters.to).getTime()   : Infinity;
    const rows = apps.filter((a) => {
      if (q) {
        const hay = `${a.business_name || ""} ${a.company_name || ""} ${a.guarantor_name || ""} ${a.application_code || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.stage) {
        const r = resolveStageId(a.stage);
        if (r !== filters.stage) return false;
      }
      if (filters.source && a.source !== filters.source) return false;
      if (filters.carrier) {
        if (filters.carrier === "none") {
          if (a.carrier_last_event) return false;
        } else {
          if (a.carrier_last_event !== filters.carrier) return false;
        }
      }
      if (filters.from || filters.to) {
        const t = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        if (t < fromMs || t > toMs) return false;
      }
      return true;
    });
    rows.sort((a, b) => {
      switch (filters.sort) {
        case "updated_asc":  return (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime());
        case "amount_desc":  return (b.loan_amount || 0) - (a.loan_amount || 0);
        case "amount_asc":   return (a.loan_amount || 0) - (b.loan_amount || 0);
        default:             return (new Date(b.updated_at || 0).getTime()) - (new Date(a.updated_at || 0).getTime());
      }
    });
    return rows;
  }, [apps, filters]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of visible) {
      const r = resolveStageId(a.stage);
      if (r) out[r] = (out[r] || 0) + 1;
    }
    return out;
  }, [visible]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => setFilters(EMPTY);

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Pipeline</h2>
        <button onClick={() => void load()} className="rounded border border-card px-3 py-1 text-sm text-white/70 hover:text-white">Refresh</button>
      </div>

      {/* BI-specific filter set per BI_SUBMISSION_PIPELINE_V1.md.
          NO Product Type, Submission Method, Lender Assigned, or
          Lender Status -- those are BF concepts. */}
      <div className="mb-5 grid gap-3 md:grid-cols-3 lg:grid-cols-7 items-end">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Search
          <input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Business or applicant"
            className="rounded border border-card bg-brand-surface px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Stage
          <select value={filters.stage} onChange={(e) => set({ stage: e.target.value as Filters["stage"] })} className="rounded border border-card bg-brand-surface px-2 py-1.5 text-sm text-white">
            <option value="">All stages</option>
            {BI_VISIBLE_PIPELINE_STAGES.map((id) => (<option key={id} value={id}>{biStageLabel(id)}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Source
          <select value={filters.source} onChange={(e) => set({ source: e.target.value as Filters["source"] })} className="rounded border border-card bg-brand-surface px-2 py-1.5 text-sm text-white">
            <option value="">Any source</option>
            <option value="public">Public</option>
            <option value="lender">Lender</option>
            <option value="referrer">Referrer</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Carrier event
          <select value={filters.carrier} onChange={(e) => set({ carrier: e.target.value as Filters["carrier"] })} className="rounded border border-card bg-brand-surface px-2 py-1.5 text-sm text-white">
            <option value="">Any</option>
            <option value="quoted">Quoted</option>
            <option value="declined">Declined</option>
            <option value="info_required">Info required</option>
            <option value="policy_bound">Policy bound</option>
            <option value="none">Not yet sent</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          From
          <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className="rounded border border-card bg-brand-surface px-2 py-1.5 text-sm text-white" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          To
          <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className="rounded border border-card bg-brand-surface px-2 py-1.5 text-sm text-white" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Sort
          <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as Sort })} className="rounded border border-card bg-brand-surface px-2 py-1.5 text-sm text-white">
            <option value="updated_desc">Updated (newest)</option>
            <option value="updated_asc">Updated (oldest)</option>
            <option value="amount_desc">Amount (high to low)</option>
            <option value="amount_asc">Amount (low to high)</option>
          </select>
        </label>
      </div>
      {/* BF_PORTAL_BLOCK_54_BI_DETAIL_OWNERSHIP_DEMO_v1 — show-demo toggle. */}
      <div className="mb-5 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={filters.show_demo}
            onChange={(e) => set({ show_demo: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          Show demo applications
        </label>
        <button onClick={reset} className="rounded border border-card px-3 py-1 text-xs text-white/70 hover:text-white">Reset filters</button>
      </div>

      {/* 10 stage columns per spec. Demo apps already filtered out. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10">
        {BI_VISIBLE_PIPELINE_STAGES.map((stageId) => (
          <div key={stageId} className="bg-brand-bgAlt border border-card rounded-xl p-3">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xs uppercase tracking-widest text-white/70">{biStageLabel(stageId)}</h3>
              <span className="text-xs text-white/40">{counts[stageId] || 0}</span>
            </div>
            <div className="space-y-2">
              {visible
                .filter((a) => resolveStageId(a.stage) === stageId)
                .map((app) => {
                  const company = app.business_name || app.company_name || "Untitled";
                  const amount  = fmtMoney(app.loan_amount);
                  const carrierChip = app.carrier_last_event || (app.carrier_received_at ? "received" : null);
                  return (
                    <div
                      key={app.id}
                      onClick={() => navigate(`/silo/bi/pipeline/${app.id}`)}
                      className="bg-brand-surface border border-card rounded-lg p-3 cursor-pointer hover:border-blue-400/40"
                    >
                      <div className="min-w-0">
                        <strong className="text-sm break-words block">{company}</strong>
                        {app.guarantor_name && <div className="text-xs text-white/60 break-words">{app.guarantor_name}</div>}
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {app.source === "lender" ? `Lender${app.lender_name ? ` (${app.lender_name})` : ""}` : app.source === "referrer" ? "Referrer" : "Public"}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
                        {amount && <span className="text-white/80">{amount}</span>}
                        {carrierChip && (
                          <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-200 border border-blue-500/30">
                            carrier: {carrierChip}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {(counts[stageId] || 0) === 0 && (
                <div className="text-xs text-white/30 italic py-2 text-center">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
