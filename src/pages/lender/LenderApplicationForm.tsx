import { useMemo, useState } from "react";
import { api } from "@/api";

type Props = { onClose: () => void; onSubmitted: () => void };

const initial = {
  business_name: "",
  guarantor_name: "",
  guarantor_email: "",
  guarantor_phone: "",
  lender_name: "",
  form_data: {
    country: "CA" as "CA" | "US",
    naics_code: "",
    formation_date: "",
    loan_amount: 0,
    pgi_limit: 0,
    annual_revenue: 0,
    ebitda: 0,
    total_debt: 0,
    monthly_debt_service: 0,
    collateral_value: 0,
    enterprise_value: 0,
    bankruptcy_history: false,
    insolvency_history: false,
    judgment_history: false
  }
};

export default function LenderApplicationForm({ onClose, onSubmitted }: Props) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const updateTop = (k: keyof typeof initial, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const updateFd = (k: keyof typeof initial.form_data, v: number | string | boolean) =>
    setForm((f) => ({ ...f, form_data: { ...f.form_data, [k]: v } }));

  const valid = useMemo(() => {
    const f = form;
    const fd = f.form_data;
    return Boolean(
      f.business_name &&
        f.guarantor_name &&
        f.guarantor_email &&
        f.guarantor_phone &&
        f.lender_name &&
        /^\d{6}$/.test(fd.naics_code) &&
        fd.formation_date &&
        fd.loan_amount > 0 &&
        fd.pgi_limit > 0 &&
        fd.pgi_limit <= fd.loan_amount
    );
  }, [form]);

  async function submit() {
    if (!valid) {
      setErr("Complete all fields. PGI limit must be ≤ loan amount.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api("/api/v1/bi/lender/application", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { Authorization: `Bearer ${sessionStorage.getItem("lender_token")}` }
      });
      onSubmitted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  const num = (k: keyof typeof initial.form_data, label: string) => (
    <label key={String(k)} className="block">
      <span className="text-xs">{label}</span>
      <input
        className="w-full border rounded p-2"
        type="number"
        value={(form.form_data[k] as number) || ""}
        onChange={(e) => updateFd(k, Number(e.target.value))}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded p-4 w-full max-w-2xl max-h-[90vh] overflow-auto space-y-3">
        <h2 className="text-lg font-semibold">Add Application</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs">Business Name</span>
            <input className="w-full border rounded p-2"
              value={form.business_name} onChange={(e) => updateTop("business_name", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs">Lender Name</span>
            <input className="w-full border rounded p-2"
              value={form.lender_name} onChange={(e) => updateTop("lender_name", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs">Guarantor Name</span>
            <input className="w-full border rounded p-2"
              value={form.guarantor_name} onChange={(e) => updateTop("guarantor_name", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs">Guarantor Email</span>
            <input className="w-full border rounded p-2" type="email"
              value={form.guarantor_email} onChange={(e) => updateTop("guarantor_email", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs">Guarantor Phone</span>
            <input className="w-full border rounded p-2" type="tel"
              value={form.guarantor_phone} onChange={(e) => updateTop("guarantor_phone", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs">Country</span>
            <select className="w-full border rounded p-2" value={form.form_data.country}
              onChange={(e) => updateFd("country", e.target.value)}>
              <option value="CA">Canada</option>
              <option value="US">USA</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs">NAICS Code (6 digits)</span>
            <input className="w-full border rounded p-2" maxLength={6}
              value={form.form_data.naics_code}
              onChange={(e) => updateFd("naics_code", e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="block">
            <span className="text-xs">Formation Date</span>
            <input className="w-full border rounded p-2" type="date"
              value={form.form_data.formation_date}
              onChange={(e) => updateFd("formation_date", e.target.value)} />
          </label>
          {num("loan_amount", "Loan Amount")}
          {num("pgi_limit", "PGI Limit (≤ loan amount)")}
          {num("annual_revenue", "Annual Revenue")}
          {num("ebitda", "EBITDA")}
          {num("total_debt", "Total Debt")}
          {num("monthly_debt_service", "Monthly Debt Service")}
          {num("collateral_value", "Collateral Value")}
          {num("enterprise_value", "Enterprise Value")}
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.form_data.bankruptcy_history}
              onChange={(e) => updateFd("bankruptcy_history", e.target.checked)} />
            Bankruptcy history
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.form_data.insolvency_history}
              onChange={(e) => updateFd("insolvency_history", e.target.checked)} />
            Insolvency history
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.form_data.judgment_history}
              onChange={(e) => updateFd("judgment_history", e.target.checked)} />
            Judgment history
          </label>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="ui-button ui-button--secondary" onClick={onClose}>Cancel</button>
          <button className="ui-button ui-button--primary"
            disabled={saving || !valid} onClick={submit}>
            {saving ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
