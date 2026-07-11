// BF_PORTAL_REFERRER_PROFILE_EDIT_v1 - editable referrer info, pre-filled from /me.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("referrer_token")}` };
}

export default function ReferrerProfilePage() {
  const [form, setForm] = useState({ full_name: "", company_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api<{ first_name?: string; last_name?: string; company_name?: string; email?: string; phone?: string }>(
      "/api/referrer/me", { headers: authHeader() },
    ).then((me) => {
      if (cancelled || !me) return;
      const full = [me.first_name, me.last_name].filter(Boolean).join(" ").trim();
      setForm({ full_name: full, company_name: me.company_name ?? "", email: me.email ?? "", phone: me.phone ?? "" });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const valid = form.full_name && form.email && form.phone;

  async function save() {
    setSaving(true); setErr(null); setSaved(false);
    try {
      await api("/api/referrer/profile", { method: "POST", body: JSON.stringify(form), headers: authHeader() });
      setSaved(true);
      window.setTimeout(() => navigate("/referrer"), 700);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save your info.");
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded border bg-white p-4 space-y-3">
        <h1 className="text-xl font-semibold">Your info</h1>
        <p className="text-sm text-slate-500">Update your details. This is where we send referral updates and issue your referral fees.</p>
        <input className="w-full border rounded p-2" placeholder="Full name"
          value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="w-full border rounded p-2" placeholder="Company name (optional)"
          value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <input className="w-full border rounded p-2" type="email" placeholder="Email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full border rounded p-2" type="tel" placeholder="Mobile phone"
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {saved && <p className="text-sm text-green-700">Saved.</p>}
        <div className="flex gap-2">
          <button className="ui-button ui-button--secondary w-full" onClick={() => navigate("/referrer")}>Back</button>
          <button className="ui-button ui-button--primary w-full" disabled={!valid || saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
