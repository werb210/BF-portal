import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

export default function LenderProfilePage() {
  const [form, setForm] = useState({ full_name: "", company_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const valid = form.full_name && form.company_name && form.email && form.phone;

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await api("/api/v1/bi/lender/profile", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { Authorization: `Bearer ${sessionStorage.getItem("lender_token")}` }
      });
      navigate("/lender-portal/deals");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded border bg-white p-4 space-y-3">
        <h1 className="text-xl font-semibold">Complete your profile</h1>
        <input className="w-full border rounded p-2" placeholder="Full Name"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="w-full border rounded p-2" placeholder="Company Name"
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <input className="w-full border rounded p-2" type="email" placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full border rounded p-2" type="tel" placeholder="Mobile phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="ui-button ui-button--primary w-full"
          disabled={!valid || saving} onClick={save}>
          Continue
        </button>
      </div>
    </div>
  );
}
