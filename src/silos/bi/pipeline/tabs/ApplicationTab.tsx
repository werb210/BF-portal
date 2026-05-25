// BF_PORTAL_BLOCK_v629_BI_PURBECK_RENDER_v1
// Renders the Purbeck-aligned application fields with legacy-column fallback.
import { useMemo } from "react";
import { DeclarationsCard } from "./DeclarationsCard";
import { CoGuarantorList } from "./CoGuarantorList";
import { SendToPurbeckGate } from "./SendToPurbeckGate";

type BIApplication = {
  id: string;
  public_id?: string;
  // Legacy columns
  guarantor_name?: string;
  guarantor_email?: string;
  guarantor_phone?: string;
  business_name?: string;
  lender_name?: string;
  loan_amount?: number | string;
  pgi_limit?: number | string;
  country?: string;
  // New q-keyed columns (preferred when present)
  q_business_province?: string;
  q_ca_loan_type?: string;
  q_ca_id_type?: string;
  q_ca_id_number?: string;
  has_co_guarantors?: boolean;
  declarations?: Record<string, unknown>;
  data?: Record<string, unknown>;
  loan_agreement_uploaded_at?: string | null;
  pgi_application_id?: string | null;
  status?: string;
};

function fmtMoney(v: number | string | undefined | null): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `$${n.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`;
}
function fmtDate(v: string | undefined | null): string {
  if (!v) return "—";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function ApplicationTab({ app }: { app: BIApplication }) {
  const d = (app.data as Record<string, unknown>) || {};

  // Source-of-truth lookups: prefer q-keyed column, fall back to data JSONB, fall back to legacy column.
  const pick = (qKey: string, legacyKey?: string): string => {
    const fromCol = (app as Record<string, unknown>)[qKey];
    if (fromCol != null && fromCol !== "") return String(fromCol);
    const fromData = d[qKey];
    if (fromData != null && fromData !== "") return String(fromData);
    if (legacyKey) {
      const fromLegacyCol = (app as Record<string, unknown>)[legacyKey];
      if (fromLegacyCol != null && fromLegacyCol !== "") return String(fromLegacyCol);
      const fromLegacyData = d[legacyKey];
      if (fromLegacyData != null && fromLegacyData !== "") return String(fromLegacyData);
    }
    return "";
  };

  const carrierEligibilityIssues = useMemo<string[]>(() => {
    const issues: string[] = [];
    const province = pick("q_business_province", "business_province");
    if (province.toUpperCase() === "QC") issues.push("Quebec address — PGI does not write business in Quebec.");
    const loanType = pick("q_ca_loan_type", "loan_purpose");
    if (loanType && !["Commercial Mortgage", "Other Secured Loan"].includes(loanType)) {
      issues.push(`Loan type '${loanType}' is not eligible (must be Commercial Mortgage or Other Secured Loan).`);
    }
    const loanAmount = Number(pick("q41_loan_amount", "loan_amount"));
    if (Number.isFinite(loanAmount) && loanAmount > 1_000_000) issues.push(`Loan amount ${fmtMoney(loanAmount)} exceeds the 1,000,000 cap.`);
    const pgiLimit = Number(pick("q42_pgi_limit", "pgi_limit"));
    if (Number.isFinite(pgiLimit) && pgiLimit > 1_000_000) issues.push(`PGI limit ${fmtMoney(pgiLimit)} exceeds the 1,000,000 cap.`);
    return issues;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  return (
    <div className="space-y-6">
      {carrierEligibilityIssues.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 p-3">
          <strong className="text-red-700">Carrier eligibility issues</strong>
          <ul className="list-disc pl-5 text-sm text-red-700 mt-1">
            {carrierEligibilityIssues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}

      <section>
        <h3 className="font-semibold mb-2">Director / Guarantor</h3>
        <Field label="Full legal name" value={pick("q2_full_name", "guarantor_name") || "—"} />
        <Field label="Date of birth" value={fmtDate(pick("q4_date_of_birth", "guarantor_dob"))} />
        <Field label="Residential address" value={pick("q5_residential_address", "guarantor_address") || "—"} />
        <Field label="Email" value={pick("guarantor_email") || "—"} />
        <Field label="Phone" value={pick("guarantor_phone") || "—"} />
        <Field label="Gov ID type" value={pick("q_ca_id_type") || <span className="text-amber-600">Not collected yet</span>} />
        <Field label="Gov ID number" value={pick("q_ca_id_number") || <span className="text-amber-600">Not collected yet</span>} />
      </section>

      <section>
        <h3 className="font-semibold mb-2">Business</h3>
        <Field label="Legal name" value={pick("q15_business_legal_name", "business_name") || "—"} />
        <Field label="Operating address" value={pick("q17_business_operating_address", "business_address") || "—"} />
        <Field label="Province" value={pick("q_business_province", "business_province") || "—"} />
        <Field label="NAICS" value={pick("q25_naics_code", "naics_code") || "—"} />
        <Field label="Formation date" value={fmtDate(pick("q26_formation_date", "formation_date"))} />
      </section>

      <section>
        <h3 className="font-semibold mb-2">Loan</h3>
        <Field label="Loan type (carrier)" value={pick("q_ca_loan_type") || <span className="text-amber-600">Not set</span>} />
        <Field label="Loan amount" value={fmtMoney(Number(pick("q41_loan_amount", "loan_amount")) || undefined)} />
        <Field label="PGI limit" value={fmtMoney(Number(pick("q42_pgi_limit", "pgi_limit")) || undefined)} />
        <Field label="Lender" value={pick("lender_name") || "—"} />
        <Field label="Loan purpose (internal)" value={pick("loan_purpose") || "—"} />
      </section>

      <CoGuarantorList applicationId={app.id} hasCoGuarantors={app.has_co_guarantors === true} />

      <DeclarationsCard declarations={app.declarations || {}} />

      <SendToPurbeckGate
        applicationId={app.id}
        status={app.status}
        pgiApplicationId={app.pgi_application_id ?? null}
        loanAgreementUploadedAt={app.loan_agreement_uploaded_at ?? null}
      />
    </div>
  );
}
