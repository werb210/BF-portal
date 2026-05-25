// BF_PORTAL_BLOCK_v630_LENDER_PURBECK_RENDER_v1
// Staff-side lender app creation form. Wire shape matches bi-server v350
// /api/v1/lender/applications. Risk booleans dropped. Declarations + new
// q-fields added. Co-guarantors are a separate intake handled via the
// BI silo (CoGuarantorList), not here.
import { useMemo, useState } from "react";
import { api } from "@/api";

type Props = { onClose: () => void; onSubmitted: () => void };

const PROVINCES_NO_QC = [
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","SK","YT",
] as const;
const ELIGIBLE_LOAN_TYPES = ["Commercial Mortgage", "Other Secured Loan"] as const;
const LOAN_AMOUNT_MAX = 1_000_000;
const PGI_LIMIT_MAX = 1_000_000;

type Declarations = {
  section_1_a: "" | "yes" | "no";
  section_1_2: "" | "yes" | "no"; section_1_2_reason: string;
  section_2_a: "" | "yes" | "no"; section_2_a_reason: string;
  section_2_b: "" | "yes" | "no"; section_2_b_reason: string;
  section_2_c: "" | "yes" | "no"; section_2_c_reason: string;
  section_2_d: "" | "yes" | "no"; section_2_d_reason: string;
  section_3_a: "" | "yes" | "no"; section_3_a_reason: string;
  section_3_c: "" | "Agree" | "Disagree"; section_3_c_reason: string;
  section_4_a: "" | "yes" | "no"; section_4_a_reason: string;
  section_5_a: "" | "yes" | "no"; section_5_a_reason: string;
  section_6_a: "" | "yes" | "no";
};

const blankDecl: Declarations = {
  section_1_a: "", section_1_2: "", section_1_2_reason: "",
  section_2_a: "", section_2_a_reason: "",
  section_2_b: "", section_2_b_reason: "",
  section_2_c: "", section_2_c_reason: "",
  section_2_d: "", section_2_d_reason: "",
  section_3_a: "", section_3_a_reason: "",
  section_3_c: "", section_3_c_reason: "",
  section_4_a: "", section_4_a_reason: "",
  section_5_a: "", section_5_a_reason: "",
  section_6_a: "",
};

const initial = {
  company_name: "",
  guarantor: { name: "", phone: "", email: "", dob: "", address: "" },
  business: {
    entity_type: "", business_number: "", address: "", website: "",
    province: "", naics: "", start_date: "", country: "CA" as "CA" | "US",
  },
  loan: {
    amount: 0, pgi_limit: 0, q_ca_loan_type: "" as "" | (typeof ELIGIBLE_LOAN_TYPES)[number],
    use_of_proceeds: "expansion", loan_funding_date: "", policy_start_date: "",
    csbfp_backed: null as boolean | null, loan_has_guaranteed_cap: null as boolean | null,
    personally_guaranteeing: null as boolean | null, has_other_guarantors: false,
  },
  financials: {
    revenue_last_year: 0, ebitda_last_year: 0, total_debt: 0, monthly_payments: 0,
    annual_revenue: 0, ebitda: 0, monthly_debt_service: 0,
    collateral_value: 0, enterprise_value: 0,
  },
  declarations: blankDecl,
};

export default function LenderApplicationForm({ onClose, onSubmitted }: Props) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // BF_PORTAL_BLOCK_v631_HOTFIX_v629_v630_v1
  // Generic setter for nested fields. setNested is only ever called with
  // a non-empty dotted path (e.g. "guarantor.name"), so the bang asserts
  // are sound and satisfy noUncheckedIndexedAccess.
  function setNested(path: string, value: unknown) {
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      if (keys.length === 0) return prev;
      let cur: Record<string, unknown> = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]!] as Record<string, unknown>;
      }
      cur[keys[keys.length - 1]!] = value;
      return next;
    });
  }

  const validation = useMemo(() => {
    const issues: string[] = [];
    if (!form.company_name.trim()) issues.push("Company name required.");
    if (!form.guarantor.name.trim()) issues.push("Guarantor name required.");
    if (!form.guarantor.phone.trim()) issues.push("Guarantor phone required.");
    if (!/^\d{6}$/.test(form.business.naics)) issues.push("NAICS must be 6 digits.");
    if (!form.business.start_date) issues.push("Business start date required.");
    if (form.business.province.toUpperCase() === "QC") issues.push("PGI does not currently write business in Quebec.");
    if (!form.business.province) issues.push("Business province required.");
    if (Number(form.loan.amount) <= 0) issues.push("Loan amount must be > 0.");
    if (Number(form.loan.amount) > LOAN_AMOUNT_MAX) issues.push(`Loan amount exceeds 1,000,000 cap.`);
    if (Number(form.loan.pgi_limit) <= 0) issues.push("PGI limit must be > 0.");
    if (Number(form.loan.pgi_limit) > PGI_LIMIT_MAX) issues.push(`PGI limit exceeds 1,000,000 cap.`);
    if (Number(form.loan.pgi_limit) > Number(form.loan.amount)) issues.push("PGI limit cannot exceed loan amount.");
    if (!form.loan.q_ca_loan_type) issues.push("Loan type required (Commercial Mortgage or Other Secured Loan).");

    // Declarations: must all be answered + reasons paired.
    const d = form.declarations;
    const decl: Array<[keyof Declarations, "yes" | "Disagree", keyof Declarations]> = [
      ["section_1_2", "yes", "section_1_2_reason"],
      ["section_2_a", "yes", "section_2_a_reason"],
      ["section_2_b", "yes", "section_2_b_reason"],
      ["section_2_c", "yes", "section_2_c_reason"],
      ["section_2_d", "yes", "section_2_d_reason"],
      ["section_3_a", "yes", "section_3_a_reason"],
      ["section_3_c", "Disagree", "section_3_c_reason"],
      ["section_4_a", "yes", "section_4_a_reason"],
      ["section_5_a", "yes", "section_5_a_reason"],
    ];
    const allKeys: (keyof Declarations)[] = ["section_1_a","section_1_2","section_2_a","section_2_b","section_2_c","section_2_d","section_3_a","section_3_c","section_4_a","section_5_a","section_6_a"];
    for (const k of allKeys) if (!d[k]) issues.push(`Declaration '${k}' must be answered.`);
    for (const [k, adverse, reasonKey] of decl) {
      if (d[k] === adverse && !String(d[reasonKey]).trim()) {
        issues.push(`Reason required when ${k} is '${adverse}'.`);
      }
    }
    return { ok: issues.length === 0, issues };
  }, [form]);

  async function submit() {
    if (!validation.ok) return;
    setSaving(true); setErr(null);
    try {
      // Filter cleaned declarations (drop empty adverse reasons).
      const cleaned: Record<string, unknown> = { ...form.declarations };
      const adverseMap: Array<[keyof Declarations, string]> = [
        ["section_1_2", "yes"], ["section_2_a", "yes"], ["section_2_b", "yes"],
        ["section_2_c", "yes"], ["section_2_d", "yes"], ["section_3_a", "yes"],
        ["section_4_a", "yes"], ["section_5_a", "yes"], ["section_3_c", "Disagree"],
      ];
      for (const [k, advVal] of adverseMap) {
        const rk = `${k}_reason` as keyof Declarations;
        if (form.declarations[k] !== advVal) delete cleaned[rk];
        else if (!String(form.declarations[rk]).trim()) delete cleaned[rk];
      }

      const body = {
        source: "lender",
        company_name: form.company_name,
        business_name: form.company_name,
        lender_name: null,
        guarantor: form.guarantor,
        business: form.business,
        loan: form.loan,
        financials: form.financials,
        declarations: cleaned,
        co_guarantors: [], // staff-side form does not collect co-guarantors; use BI silo for that
      };
      const r = await api.post("/api/v1/bi/lender/applications", body);
      if (r?.ok) {
        onSubmitted();
        onClose();
      } else {
        setErr(r?.error || r?.message || "Submit failed");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create Lender Application (Purbeck-aligned)</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <section className="mb-4">
          <h3 className="font-semibold mb-2">Company + Guarantor</h3>
          <input className="w-full border p-2 rounded mb-2" placeholder="Company name *" value={form.company_name} onChange={(e) => setNested("company_name", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2 rounded" placeholder="Guarantor name *" value={form.guarantor.name} onChange={(e) => setNested("guarantor.name", e.target.value)} />
            <input className="border p-2 rounded" placeholder="Guarantor phone *" value={form.guarantor.phone} onChange={(e) => setNested("guarantor.phone", e.target.value)} />
            <input className="border p-2 rounded" placeholder="Guarantor email" value={form.guarantor.email} onChange={(e) => setNested("guarantor.email", e.target.value)} />
            <input type="date" className="border p-2 rounded" placeholder="DOB" value={form.guarantor.dob} onChange={(e) => setNested("guarantor.dob", e.target.value)} />
            <input className="col-span-2 border p-2 rounded" placeholder="Residential address" value={form.guarantor.address} onChange={(e) => setNested("guarantor.address", e.target.value)} />
          </div>
        </section>

        <section className="mb-4">
          <h3 className="font-semibold mb-2">Business</h3>
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2 rounded" placeholder="NAICS (6 digits) *" value={form.business.naics} onChange={(e) => setNested("business.naics", e.target.value)} />
            <input type="date" className="border p-2 rounded" placeholder="Start date *" value={form.business.start_date} onChange={(e) => setNested("business.start_date", e.target.value)} />
            <select className="border p-2 rounded" value={form.business.province} onChange={(e) => setNested("business.province", e.target.value)}>
              <option value="">Province *</option>
              {PROVINCES_NO_QC.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="border p-2 rounded" placeholder="Operating address" value={form.business.address} onChange={(e) => setNested("business.address", e.target.value)} />
          </div>
        </section>

        <section className="mb-4">
          <h3 className="font-semibold mb-2">Loan</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="border p-2 rounded" placeholder="Loan amount *" max={LOAN_AMOUNT_MAX} value={form.loan.amount || ""} onChange={(e) => setNested("loan.amount", Number(e.target.value))} />
            <input type="number" className="border p-2 rounded" placeholder="PGI limit *" max={PGI_LIMIT_MAX} value={form.loan.pgi_limit || ""} onChange={(e) => setNested("loan.pgi_limit", Number(e.target.value))} />
            <select className="col-span-2 border p-2 rounded" value={form.loan.q_ca_loan_type} onChange={(e) => setNested("loan.q_ca_loan_type", e.target.value)}>
              <option value="">Loan type * (carrier eligibility)</option>
              {ELIGIBLE_LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="font-semibold mb-2">Financials (for CORE Score)</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="border p-2 rounded" placeholder="Annual revenue" value={form.financials.annual_revenue || ""} onChange={(e) => { setNested("financials.annual_revenue", Number(e.target.value)); setNested("financials.revenue_last_year", Number(e.target.value)); }} />
            <input type="number" className="border p-2 rounded" placeholder="EBITDA" value={form.financials.ebitda || ""} onChange={(e) => { setNested("financials.ebitda", Number(e.target.value)); setNested("financials.ebitda_last_year", Number(e.target.value)); }} />
            <input type="number" className="border p-2 rounded" placeholder="Total debt" value={form.financials.total_debt || ""} onChange={(e) => setNested("financials.total_debt", Number(e.target.value))} />
            <input type="number" className="border p-2 rounded" placeholder="Monthly debt service" value={form.financials.monthly_debt_service || ""} onChange={(e) => { setNested("financials.monthly_debt_service", Number(e.target.value)); setNested("financials.monthly_payments", Number(e.target.value)); }} />
            <input type="number" className="border p-2 rounded" placeholder="Collateral value" value={form.financials.collateral_value || ""} onChange={(e) => setNested("financials.collateral_value", Number(e.target.value))} />
            <input type="number" className="border p-2 rounded" placeholder="Enterprise value" value={form.financials.enterprise_value || ""} onChange={(e) => setNested("financials.enterprise_value", Number(e.target.value))} />
          </div>
        </section>

        <section className="mb-4">
          <h3 className="font-semibold mb-2">Declarations (Purbeck — all 11 required)</h3>
          <DeclarationRow label="Consent to underwriting / credit checks" k="section_1_a" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} />
          <DeclarationRow label="Past loan default / write-off / called credit" k="section_1_2" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_1_2_reason" />
          <DeclarationRow label="Personal bankruptcy history" k="section_2_a" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_2_a_reason" />
          <DeclarationRow label="Business insolvency / receivership history" k="section_2_b" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_2_b_reason" />
          <DeclarationRow label="Outstanding personal judgments / liens" k="section_2_c" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_2_c_reason" />
          <DeclarationRow label="Outstanding business judgments / liens" k="section_2_d" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_2_d_reason" />
          <DeclarationRow label="Criminal proceedings (past or pending)" k="section_3_a" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_3_a_reason" />
          <DeclarationRow label="Agree to policy terms" k="section_3_c" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="Disagree" reasonKey="section_3_c_reason" agreeDisagree />
          <DeclarationRow label="Regulatory investigations" k="section_4_a" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_4_a_reason" />
          <DeclarationRow label="Anticipated material adverse change (12mo)" k="section_5_a" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} adverseTriggers="yes" reasonKey="section_5_a_reason" />
          <DeclarationRow label="Certify information is accurate" k="section_6_a" decl={form.declarations} setDecl={(d) => setNested("declarations", d)} />
        </section>

        {validation.issues.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3 text-sm">
            <ul className="list-disc pl-4">{validation.issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        )}
        {err && <div className="text-red-600 mb-2">{err}</div>}

        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={submit} disabled={!validation.ok || saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40">
            {saving ? "Submitting…" : "Create application"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeclarationRow({
  label, k, decl, setDecl, adverseTriggers, reasonKey, agreeDisagree,
}: {
  label: string;
  k: keyof Declarations;
  decl: Declarations;
  setDecl: (d: Declarations) => void;
  adverseTriggers?: "yes" | "Disagree";
  reasonKey?: keyof Declarations;
  agreeDisagree?: boolean;
}) {
  const value = decl[k] as string;
  const showReason = adverseTriggers && reasonKey && value === adverseTriggers;
  return (
    <div className="mb-2">
      <label className="text-sm text-gray-700 block">{label}</label>
      <select className="border p-2 rounded w-full" value={value}
              onChange={(e) => setDecl({ ...decl, [k]: e.target.value as any })}>
        <option value="">Select…</option>
        {agreeDisagree ? (
          <>
            <option value="Agree">Agree</option>
            <option value="Disagree">Disagree</option>
          </>
        ) : (
          <>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </>
        )}
      </select>
      {showReason && reasonKey && (
        <textarea className="mt-1 border p-2 rounded w-full" rows={2} placeholder="Please explain..."
                  value={String(decl[reasonKey])}
                  onChange={(e) => setDecl({ ...decl, [reasonKey]: e.target.value as any })} />
      )}
    </div>
  );
}
