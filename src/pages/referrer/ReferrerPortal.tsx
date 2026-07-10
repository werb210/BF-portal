import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
// REFERRER_BF_WIRING_v1 - BF referral pipeline stages (was insurance PGI stages).
// A referral with no application yet, or a pipeline_state we don't recognize,
// falls into "No Application Yet".
const BF_STAGES = ["New", "Requires Docs", "In Review", "Off to Lender", "Offer", "Accepted", "Funded", "Rejected"] as const;
type BFStage = typeof BF_STAGES[number];
const BF_STAGE_LABEL: Record<string, string> = {
  New: "New", "Requires Docs": "Requires Docs", "In Review": "In Review",
  "Off to Lender": "Off to Lender", Offer: "Offer", Accepted: "Accepted",
  Funded: "Funded", Rejected: "Rejected",
};

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
  // BF_PORTAL_REFERRER_UNIFY_UI_v1
  const [form, setForm] = useState({ first_name: "", last_name: "", business_name: "", email: "", phone: "" });
  const [silos, setSilos] = useState<{ BF: boolean; BI: boolean }>({ BF: true, BI: false });
  const [message, setMessage] = useState<"A" | "B">("A");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const res = await api<{ referrals: Referral[] }>(
        "/api/referrer/pipeline",
        { headers: authHeader() }
      );
      setReferrals(res.referrals || []);
    } catch {
      setReferrals([]);
    }
  }

  const grouped = useMemo(() => {
    const g: Partial<Record<BFStage | "new", Referral[]>> = { new: [] };
    BF_STAGES.forEach((stage) => {
      g[stage] = [];
    });
    referrals.forEach((r) => {
      const key =
        r.application_stage && BF_STAGES.includes(r.application_stage as BFStage)
          ? (r.application_stage as BFStage)
          : "new";
      (g[key] ??= []).push(r);
    });
    return g as Record<BFStage | "new", Referral[]>;
  }, [referrals]);

  async function addContact() {
    if (!form.first_name || !form.phone) {
      setErr("First name and mobile are required.");
      return;
    }
    const pickedSilos: string[] = [];
    if (silos.BF) pickedSilos.push("BF");
    if (silos.BI) pickedSilos.push("BI");
    if (pickedSilos.length === 0) {
      setErr("Pick at least one product (Funding and/or PGI).");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api("/api/referrer/add-referral", {
        method: "POST",
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          business_name: form.business_name,
          email: form.email,
          phone: form.phone,
          silos: pickedSilos,
          message,
        }),
        headers: authHeader()
      });
      setForm({ first_name: "", last_name: "", business_name: "", email: "", phone: "" });
      setSilos({ BF: true, BI: false });
      setMessage("A");
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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <section className="drawer-section">
          <div className="drawer-section__title">No Application Yet</div>
          <div className="space-y-2">
            {(grouped.new ?? []).map((r) => (
              <article key={r.id} className="rounded border p-2">
                <div className="font-medium">{r.full_name}</div>
                <div className="text-sm">{r.company_name || ""}</div>
                <div className="text-xs text-slate-500">{r.phone_e164}</div>
              </article>
            ))}
          </div>
        </section>
        {BF_STAGES.map((s: BFStage) => (
          <section key={s} className="drawer-section">
            <div className="drawer-section__title">{BF_STAGE_LABEL[s] || s}</div>
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
            <div className="flex gap-2">
              <input className="w-full p-2 border rounded" placeholder="First Name"
                value={form.first_name}
                onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))} />
              <input className="w-full p-2 border rounded" placeholder="Last Name"
                value={form.last_name}
                onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))} />
            </div>
            <input className="w-full p-2 border rounded" placeholder="Business Name"
              value={form.business_name}
              onChange={(e) => setForm((s) => ({ ...s, business_name: e.target.value }))} />
            <input className="w-full p-2 border rounded" type="email" placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <input className="w-full p-2 border rounded" type="tel" placeholder="Mobile"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            <div className="text-sm text-slate-700">
              <div className="font-medium mb-1">Refer them to</div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={silos.BF}
                  onChange={(e) => setSilos((s) => ({ ...s, BF: e.target.checked }))} />
                Boreal Financial (funding)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={silos.BI}
                  onChange={(e) => setSilos((s) => ({ ...s, BI: e.target.checked }))} />
                Boreal Risk Management (PGI)
              </label>
            </div>
            <div className="text-sm text-slate-700">
              <div className="font-medium mb-1">Message</div>
              <label className="flex items-center gap-2">
                <input type="radio" name="refmsg" checked={message === "A"}
                  onChange={() => setMessage("A")} /> Version A
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="refmsg" checked={message === "B"}
                  onChange={() => setMessage("B")} /> Version B
              </label>
            </div>
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
