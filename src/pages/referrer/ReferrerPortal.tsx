import { useMemo, useState } from "react";

type ReferralStage = "New" | "Contacted" | "In Progress" | "Won";

type ReferralCard = {
  id: string;
  name: string;
  company: string;
  title: string;
  stage: ReferralStage;
};

const SAMPLE_REFERRALS: ReferralCard[] = [
  { id: "r1", name: "Maya Kent", company: "Nova Labs", title: "CEO", stage: "New" },
  { id: "r2", name: "Evan Lin", company: "Summit HVAC", title: "Founder", stage: "Contacted" },
  { id: "r3", name: "Olivia Rios", company: "Fleet Harbor", title: "COO", stage: "In Progress" },
  { id: "r4", name: "Daniel Hart", company: "Pine Medical", title: "Owner", stage: "Won" }
];

const STAGES: ReferralStage[] = ["New", "Contacted", "In Progress", "Won"];

const ReferrerPortal = () => {
  const [prospects, setProspects] = useState<ReferralCard[]>(SAMPLE_REFERRALS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ fullName: "", company: "", email: "", phone: "" });

  const activeReferrals = prospects.filter((item) => item.stage !== "Won").length;
  const totalWon = prospects.filter((item) => item.stage === "Won").length;
  const commissionEarned = totalWon * 12500;

  const grouped = useMemo(
    () =>
      STAGES.reduce<Record<ReferralStage, ReferralCard[]>>((acc, stage) => {
        acc[stage] = prospects.filter((item) => item.stage === stage);
        return acc;
      }, { New: [], Contacted: [], "In Progress": [], Won: [] }),
    [prospects]
  );

  const onAddProspect = () => {
    if (!form.fullName || !form.company || !form.email || !form.phone) return;
    setProspects((prev) => [
      {
        id: `r-${Date.now()}`,
        name: form.fullName,
        company: form.company,
        title: "Prospect",
        stage: "New"
      },
      ...prev
    ]);
    setForm({ fullName: "", company: "", email: "", phone: "" });
    setShowModal(false);
  };

  return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Refer Prospects</h1>
        <button className="ui-button ui-button--primary" type="button" onClick={() => setShowModal(true)}>
          Add Prospect
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="drawer-section"><div className="drawer-section__title">Active Referrals</div><div>{activeReferrals}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Total Won</div><div>{totalWon}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Commission Earned</div><div>${commissionEarned.toLocaleString()}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Trend</div><div>↗ +24% this quarter</div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STAGES.map((stage) => (
          <section key={stage} className="drawer-section">
            <div className="drawer-section__title">{stage}</div>
            <div className="space-y-2">
              {grouped[stage].map((card) => (
                <article key={card.id} className="rounded border p-2">
                  <div className="font-medium">{card.name}</div>
                  <div className="text-sm">{card.company}</div>
                  <div className="text-xs text-slate-500">{card.title}</div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded p-4 w-full max-w-md space-y-3">
            <h2 className="text-lg font-semibold">Add Prospect</h2>
            <input className="w-full p-2 border rounded" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} />
            <input className="w-full p-2 border rounded" placeholder="Company" value={form.company} onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))} />
            <input className="w-full p-2 border rounded" placeholder="Email Address" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <input className="w-full p-2 border rounded" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <button className="ui-button ui-button--secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ui-button ui-button--primary" onClick={onAddProspect}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferrerPortal;
