// BF_PORTAL_BLOCK_v629_BI_PURBECK_RENDER_v1
// BF_PORTAL_BLOCK_v631_HOTFIX_v629_v630_v1
// BF_PORTAL_BLOCK_v656_BI_APPLICATION_RENDER_v1 — address formatting +
// carrier-eligibility fallback removal.
// Renders the Purbeck-aligned application fields with legacy-column fallback.
import { useMemo } from "react";
import { DeclarationsCard } from "./DeclarationsCard";
import { CoGuarantorList } from "./CoGuarantorList";
import { SendToPurbeckGate } from "./SendToPurbeckGate";

type BIApplication = {
  id: string;
  public_id?: string | null;
  // Legacy columns
  guarantor_name?: string | null;
  guarantor_email?: string | null;
  guarantor_phone?: string | null;
  business_name?: string | null;
  lender_name?: string | null;
  loan_amount?: number | string | null;
  pgi_limit?: number | string | null;
  country?: string | null;
  // New q-keyed columns (preferred when present)
  q_business_province?: string | null;
  q_ca_loan_type?: string | null;
  q_ca_id_type?: string | null;
  q_ca_id_number?: string | null;
  has_co_guarantors?: boolean | null;
  declarations?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
  loan_agreement_uploaded_at?: string | null;
  pgi_application_id?: string | null;
  status?: string | null;
  [key: string]: unknown;
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

// BF_PORTAL_BLOCK_v656_BI_APPLICATION_RENDER_v1
// Canadian postal code: uppercase + space after position 3 if not already
// present. Idempotent: feeding "T3P 1P6" returns "T3P 1P6".
function formatPostalCode(raw: string): string {
  const clean = String(raw).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + " " + clean.slice(3);
}

// BF_PORTAL_BLOCK_v656_BI_APPLICATION_RENDER_v1
// Render a structured address as "line1, city, province  postal_code".
// Accepts the parsed JSONB object OR a legacy JSON string (pre-v349
// rows can have the column as TEXT-of-JSON). Returns "—" for null/empty.
function formatAddress(v: unknown): string {
  if (v == null || v === "") return "—";
  let obj: Record<string, unknown> | null = null;
  if (typeof v === "string") {
    try { obj = JSON.parse(v); } catch { return v; }
  } else if (typeof v === "object") {
    obj = v as Record<string, unknown>;
  }
  if (!obj) return String(v);
  const line1 = String(obj.line1 ?? obj.address ?? "").trim();
  const city = String(obj.city ?? "").trim();
  const province = String(obj.province ?? "").trim().toUpperCase();
  const postal = formatPostalCode(String(obj.postal_code ?? ""));
  const parts: string[] = [];
  if (line1) parts.push(line1);
  if (city) parts.push(city);
  const tail = [province, postal].filter(Boolean).join(" ");
  if (tail) parts.push(tail);
  return parts.length ? parts.join(", ") : "—";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function ApplicationTab({ app, onMutated, readOnly }: { app: BIApplication; onMutated?: () => void; readOnly?: boolean }) {
  void onMutated;
  void readOnly;
  const d = (app.data as Record<string, unknown>) || {};

  // Source-of-truth lookups: prefer q-keyed column, fall back to data JSONB, fall back to legacy column.
  // Used for SCALAR fields only — addresses use pickRaw + formatAddress so
  // we don't stringify a JSONB object into JSON text.
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
  // BF_PORTAL_BLOCK_v656_BI_APPLICATION_RENDER_v1
  // Returns the raw value (object or string), not String(value).
  // Used by formatAddress so JSONB objects don't get stringified into
  // their JSON literal form.
  const pickRaw = (qKey: string, legacyKey?: string): unknown => {
    const fromCol = (app as Record<string, unknown>)[qKey];
    if (fromCol != null && fromCol !== "") return fromCol;
    const fromData = d[qKey];
    if (fromData != null && fromData !== "") return fromData;
    if (legacyKey) {
      const fromLegacyCol = (app as Record<string, unknown>)[legacyKey];
      if (fromLegacyCol != null && fromLegacyCol !== "") return fromLegacyCol;
      const fromLegacyData = d[legacyKey];
      if (fromLegacyData != null && fromLegacyData !== "") return fromLegacyData;
    }
    return null;
  };

  const carrierEligibilityIssues = useMemo<string[]>(() => {
    const issues: string[] = [];
    const province = pick("q_business_province", "business_province");
    if (province.toUpperCase() === "QC") issues.push("Quebec address — PGI does not write business in Quebec.");
    // BF_PORTAL_BLOCK_v656_BI_APPLICATION_RENDER_v1
    // ELIGIBILITY USES q_ca_loan_type ONLY — no loan_purpose fallback.
    // The form labels loan_purpose as "Internal records only. Does
    // not affect carrier eligibility." (Application.tsx:519); using
    // it as a fallback created the false "working_capital not
    // eligible" banner the operator captured tonight even though
    // the user had selected "Other Secured Loan" on the actual
    // carrier-loan-type dropdown. q_ca_loan_type missing means the
    // carrier-side question wasn't answered — that's a pre-submit
    // problem the operator can chase via "Loan type (carrier): Not
    // set" below, not a reason to mis-render an eligibility error.
    const loanType = pick("q_ca_loan_type");
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
        {/* BF_PORTAL_BLOCK_v656 — formatAddress(pickRaw(...)) instead of
            String(pickRaw(...)). Renders the JSONB as a human-readable
            line and uppercases the postal code (covers pre-v348 legacy
            rows the keystroke formatter never saw). */}
        <Field label="Residential address" value={formatAddress(pickRaw("q5_residential_address", "guarantor_address"))} />
        <Field label="Email" value={pick("guarantor_email") || "—"} />
        <Field label="Phone" value={pick("guarantor_phone") || "—"} />
        <Field label="Gov ID type" value={pick("q_ca_id_type") || <span className="text-amber-600">Not collected yet</span>} />
        <Field label="Gov ID number" value={pick("q_ca_id_number") || <span className="text-amber-600">Not collected yet</span>} />
      </section>

      <section>
        <h3 className="font-semibold mb-2">Business</h3>
        <Field label="Legal name" value={pick("q15_business_legal_name", "business_name") || "—"} />
        <Field label="Operating address" value={formatAddress(pickRaw("q17_business_operating_address", "business_address"))} />
        <Field label="Province" value={pick("q_business_province", "business_province") || "—"} />
        <Field label="NAICS" value={pick("q25_naics_code", "naics_code") || "—"} />
        <Field label="Formation date" value={fmtDate(pick("q26_formation_date", "formation_date"))} />
      </section>

      <section>
        <h3 className="font-semibold mb-2">Loan</h3>
        {/* BF_PORTAL_BLOCK_v656 — Loan type (carrier) reads ONLY
            q_ca_loan_type. No loan_purpose fallback: that column is
            internal-only per Application.tsx:519 and falling back to
            it was the source of the false "Not eligible" banners. */}
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
        status={app.status ?? undefined}
        pgiApplicationId={app.pgi_application_id ?? null}
        loanAgreementUploadedAt={app.loan_agreement_uploaded_at ?? null}
      />
    </div>
  );
}
