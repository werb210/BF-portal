// BF_PORTAL_BLOCK_v196_UNDERWRITING_BANNER_v1
// BF_PORTAL_BLOCK_54_BI_DETAIL_OWNERSHIP_DEMO_v1 — structured renderer.
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
import type { BiApplicationDetailData } from "../BIApplicationDetail";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-sm text-white">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-card bg-brand-surface p-4">
      <div className="mb-3 text-xs uppercase tracking-widest text-white/60">{title}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function fmtMoney(n: number | string | null | undefined): string | null {
  const num = typeof n === "string" ? Number(n) : n;
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(num);
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString();
}

// BF_PORTAL_BLOCK_82_45_FIELDS_v1 - boolean renderer for yes/no fields.
// Treats null/undefined as "not answered" (hidden). Strings "true"/"false"
// and actual booleans both map.
function fmtBool(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v === true || v === "true" || v === "yes" || v === 1 || v === "1") return "Yes";
  if (v === false || v === "false" || v === "no" || v === 0 || v === "0") return "No";
  return String(v);
}

function DecisionBanner({ app }: { app: BiApplicationDetailData }) {
  const stage = String(app.stage || "");
  const premium = fmtMoney(app.annual_premium ?? null);
  const validUntil = fmtDate(app.quote_valid_until ?? null);
  const bound = fmtDate(app.policy_bound_at ?? null);

  if (stage === "policy_issued") {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-emerald-300">Policy bound</div>
        <div className="mt-1 text-lg font-semibold text-white">🛡 Policy issued by carrier</div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm text-white/80">
          {premium && <div><span className="text-white/60">Annual premium</span><div className="font-semibold text-white">{premium}</div></div>}
          {app.policy_id && <div><span className="text-white/60">Policy id</span><div className="font-mono text-xs">{app.policy_id}</div></div>}
          {bound && <div><span className="text-white/60">Bound</span><div>{bound}</div></div>}
        </div>
      </div>
    );
  }

  if (stage === "approved") {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-emerald-300">Approved by carrier</div>
        <div className="mt-1 text-lg font-semibold text-white">✓ Approved — waiting on policy binding</div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm text-white/80">
          {premium && <div><span className="text-white/60">Annual premium</span><div className="font-semibold text-white">{premium}</div></div>}
          {app.quote_id && <div><span className="text-white/60">Quote</span><div className="font-mono text-xs">{app.quote_id}</div></div>}
          {app.underwriter_ref && <div><span className="text-white/60">Underwriter</span><div className="font-mono text-xs">{app.underwriter_ref}</div></div>}
        </div>
      </div>
    );
  }

  if (stage === "under_review" && premium) {
    return (
      <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-blue-300">Quoted</div>
        <div className="mt-1 text-lg font-semibold text-white">Quote returned — under review</div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm text-white/80">
          <div><span className="text-white/60">Annual premium</span><div className="font-semibold text-white">{premium}</div></div>
          {app.quote_id && <div><span className="text-white/60">Quote</span><div className="font-mono text-xs">{app.quote_id}</div></div>}
          {validUntil && <div><span className="text-white/60">Valid until</span><div>{validUntil}</div></div>}
        </div>
      </div>
    );
  }

  if (stage === "declined") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-red-300">Declined</div>
        <div className="mt-1 text-lg font-semibold text-white">✗ Carrier declined this application</div>
        {app.score_reason && (
          <div className="mt-2 text-sm text-white/80">
            <span className="text-white/60">Reason:</span>
            <div className="mt-1 italic">{app.score_reason}</div>
          </div>
        )}
      </div>
    );
  }

  if (stage === "information_required") {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-amber-200">Information required</div>
        <div className="mt-1 text-lg font-semibold text-white">ℹ Carrier requested more information</div>
        {app.score_reason && (
          <div className="mt-2 text-sm text-white/80">
            <span className="text-white/60">What they need:</span>
            <div className="mt-1 italic">{app.score_reason}</div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// BF_PORTAL_BLOCK_BI_ROUND8_DETAIL_v1 -- accept readOnly prop.
// BF_PORTAL_BLOCK_82_APPDATA_DRILL_v1 - app.data is {core_inputs:{...}}
// after server-side BLOCK_v258 schema fix. Read core_inputs as primary,
// fall back to flat top-level for legacy rows that never got migrated.
export default function ApplicationTab({ app, onMutated, readOnly = false }: { readOnly?: boolean; app: BiApplicationDetailData; onMutated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const rawData = (app.data || {}) as Record<string, unknown>;
  const core = (rawData.core_inputs as Record<string, unknown> | undefined) ?? {};
  const ext = (rawData.extended as Record<string, unknown> | undefined) ?? {};
  const consents = (rawData.consents as Record<string, unknown> | undefined) ?? {};
  // Single lookup: prefer core_inputs, then extended, then top-level legacy.
  const d = new Proxy({} as Record<string, unknown>, {
    get(_t, key: string) {
      return (core as any)[key] ?? (ext as any)[key] ?? (rawData as any)[key];
    },
  });
  const canSubmit =
    app.source_type === "public" &&
    (app.stage as string) === "document_review" &&
    app.all_docs_accepted &&
    !app.submission_locked;
  async function submitToCarrier() {
    if (!confirm("Submit this application to the carrier? The application will be locked.")) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/bi/applications/${app.id}/submit-to-carrier`, { method: "POST" });
      toast.success("Submitted to carrier");
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="space-y-6">
      <DecisionBanner app={app} />
      {!readOnly && canSubmit && (
        <button
          onClick={submitToCarrier}
          disabled={submitting}
          className="rounded bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit to Carrier"}
        </button>
      )}
      {/* BF_PORTAL_BLOCK_82_45_FIELDS_v1 - full 45-question render per
          BOREAL_FINANCIAL_SYSTEM sec 7. Six sections matching the
          applicant intake. Field hides itself when value is null/empty,
          so partial intakes still look clean. */}
      <Section title="1. Policy Holder Information">
        <Field label="Guarantor name" value={app.guarantor_name ?? (d.guarantor_name as string)} />
        <Field label="Date of birth" value={fmtDate(d.guarantor_dob as string)} />
        <Field label="Address" value={d.guarantor_address as string} />
        <Field label="Email" value={app.guarantor_email ?? (d.guarantor_email as string)} />
        <Field label="Phone" value={d.guarantor_phone as string} />
      </Section>

      <Section title="2. Business Information">
        <Field label="Country" value={d.country as string} />
        <Field label="Legal name" value={app.business_name ?? (d.business_name as string)} />
        <Field label="Address" value={d.business_address as string} />
        <Field label="Website" value={d.business_website as string} />
        <Field label="Entity type" value={d.entity_type as string} />
        <Field label="Business number" value={d.business_number as string} />
        <Field label="NAICS" value={d.naics_code as string} />
        <Field label="Revenue start month" value={d.revenue_start_month as string} />
      </Section>

      <Section title="3. Loan & Guarantee Details">
        <Field label="Loan amount" value={fmtMoney(d.loan_amount as number)} />
        <Field label="CSBFP backed" value={fmtBool(d.csbfp_backed)} />
        <Field label="Loan has guaranteed cap" value={fmtBool(d.loan_has_guaranteed_cap)} />
        <Field label="PGI limit" value={fmtMoney(d.pgi_limit as number)} />
        <Field label="Lender name" value={d.lender_name as string} />
        <Field label="Loan funding date" value={fmtDate(d.loan_funding_date as string)} />
        <Field label="Loan purpose" value={d.loan_purpose as string} />
        <Field label="Personally guaranteeing" value={fmtBool(d.personally_guaranteeing)} />
        <Field label="Has other guarantors" value={fmtBool(d.has_other_guarantors)} />
        <Field label="Policy start date" value={fmtDate(d.policy_start_date as string)} />
      </Section>

      <Section title="4. Financial Information">
        <Field label="Annual revenue" value={fmtMoney(d.annual_revenue as number)} />
        <Field label="EBITDA" value={fmtMoney(d.ebitda as number)} />
        <Field label="Total debt" value={fmtMoney(d.total_debt as number)} />
        <Field label="Monthly debt service" value={fmtMoney(d.monthly_debt_service as number)} />
        <Field label="Collateral value" value={fmtMoney(d.collateral_value as number)} />
        <Field label="Enterprise value" value={fmtMoney(d.enterprise_value as number)} />
      </Section>

      <Section title="5. Risk & Compliance">
        <Field label="Payables threatening" value={fmtBool(d.payables_threatening)} />
        <Field label="Upcoming adverse events" value={fmtBool(d.upcoming_adverse_events)} />
        <Field label="Bankruptcy history" value={fmtBool(d.bankruptcy_history)} />
        <Field label="Insolvency history" value={fmtBool(d.insolvency_history)} />
        <Field label="Personal investigations" value={fmtBool(d.personal_investigations)} />
        <Field label="Business investigations" value={fmtBool(d.business_investigations)} />
        <Field label="Property insurance in force" value={fmtBool(d.property_insurance_in_force)} />
        <Field label="Personal judgments" value={fmtBool(d.personal_judgments)} />
        <Field label="Business judgments" value={fmtBool(d.business_judgments)} />
      </Section>

      <Section title="6. Consents">
        <Field label="Electronic signature" value={fmtBool((consents as any).consent_electronic_signature ?? d.consent_electronic_signature)} />
        <Field label="Info accurate" value={fmtBool((consents as any).consent_info_accurate ?? d.consent_info_accurate ?? (consents as any).info_accurate)} />
        <Field label="Business solvent" value={fmtBool((consents as any).consent_business_solvent ?? d.consent_business_solvent)} />
        <Field label="No undisclosed events" value={fmtBool((consents as any).consent_no_undisclosed_events ?? d.consent_no_undisclosed_events)} />
        <Field label="Data use" value={fmtBool((consents as any).consent_data_use ?? d.consent_data_use ?? (consents as any).data_use)} />
        <Field label="Credit pull" value={fmtBool((consents as any).consent_credit_pull ?? d.consent_credit_pull ?? (consents as any).credit_pull)} />
        <Field label="Coverage understood" value={fmtBool((consents as any).consent_coverage_understood ?? d.consent_coverage_understood)} />
      </Section>

      <details className="rounded border border-white/10 p-2">
        <summary className="cursor-pointer text-xs text-white/40 hover:text-white/70">Raw data (debug)</summary>
        <pre className="mt-2 overflow-auto rounded bg-black/30 p-3 text-xs">{JSON.stringify(d, null, 2)}</pre>
      </details>
    </div>
  );
}
