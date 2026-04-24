import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { PGI_STAGES, PGI_STAGE_LABEL, type PGIStage } from "@/contracts/pgiStages";

type Referral = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone_e164: string;
  application_id: string | null;
  application_stage: string | null;
  created_at: string;
};

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("referrer_token")}` };
}

const ReferrerPortal = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: "", company_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const res = await api<{ referrals: Referral[] }>(
        "/api/v1/bi/referrers/referrer/pipeline",
        { headers: authHeader() }
      );
      setReferrals(res.referrals || []);
    } catch {
      setReferrals([]);
    }
  }

  const grouped = useMemo(() => {
    const g: Record<string, Referral[]> = { new: [] };
    PGI_STAGES.forEach((s) => (g[s] = []));
    referrals.forEach((r) => {
      const key = r.application_stage || "new";
      (g[key] ||= []).push(r);
    });
    return g;
  }, [referrals]);

  async function addContact() {
    if (!form.full_name || !form.phone) {
      setErr("Name and phone are required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api("/api/v1/bi/referrers/referrer/add-referral", {
        method: "POST",
        body: JSON.stringify(form),
        headers: authHeader()
      });
      setForm({ full_name: "", company_name: "", email: "", phone: "" });
      setShowModal(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Referrals</h1>
        <button className="ui-button ui-button--primary" type="button" onClick={() => setShowModal(true)}>
          Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        <section className="drawer-section">
          <div className="drawer-section__title">No Application Yet</div>
          <div className="space-y-2">
            {grouped.new.map((r) => (
              <article key={r.id} className="rounded border p-2">
                <div className="font-medium">{r.full_name}</div>
                <div className="text-sm">{r.company_name || ""}</div>
                <div className="text-xs text-slate-500">{r.phone_e164}</div>
              </article>
            ))}
          </div>
        </section>
        {PGI_STAGES.map((s: PGIStage) => (
          <section key={s} className="drawer-section">
            <div className="drawer-section__title">{PGI_STAGE_LABEL[s] || s}</div>
            <div className="space-y-2">
              {(grouped[s] || []).map((r) => (
                <article key={r.id} className="rounded border p-2">
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-sm">{r.company_name || ""}</div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded p-4 w-full max-w-md space-y-3">
            <h2 className="text-lg font-semibold">Add Contact</h2>
            <input className="w-full p-2 border rounded" placeholder="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} />
            <input className="w-full p-2 border rounded" placeholder="Company"
              value={form.company_name}
              onChange={(e) => setForm((s) => ({ ...s, company_name: e.target.value }))} />
            <input className="w-full p-2 border rounded" type="email" placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <input className="w-full p-2 border rounded" type="tel" placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button className="ui-button ui-button--secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="ui-button ui-button--primary" disabled={saving} onClick={addContact}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferrerPortal;
