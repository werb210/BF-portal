// BF_PORTAL_BLOCK_v202_OUTREACH_UI_v1
// BF_PORTAL_BLOCK_v206_BI_CONTACTS_LIST_v1 — added Contacts tab.
// BF_PORTAL_BLOCK_v209_BI_COMPANIES_LIST_v1 — added Companies tab.
import { useEffect, useState } from "react";
import { api } from "@/api";
import BIOutreach from "./BIOutreach";
import BIContactsList from "./contacts/BIContactsList";
import BICompaniesList from "./companies/BICompaniesList";

type TabKey = "contacts" | "companies" | "outreach" | "overview";

export default function BICRM() {
  const [tab, setTab] = useState<TabKey>("contacts");
  const [contacts, setContacts] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);

  useEffect(() => {
    if (tab !== "overview") return;
    let cancelled = false;
    (async () => {
      try {
        const [c, r, l] = await Promise.all([
          api("/api/v1/bi/crm/contacts"),
          api("/api/v1/bi/crm/referrers"),
          api("/api/v1/bi/crm/lenders"),
        ]);
        if (cancelled) return;
        setContacts(Array.isArray(c) ? c : (c as any)?.data ?? []);
        setReferrers(Array.isArray(r) ? r : (r as any)?.data ?? []);
        setLenders(Array.isArray(l) ? l : (l as any)?.data ?? []);
      } catch {
        /* leave lists empty on error; not blocking the page */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const tabBtn = (k: TabKey, label: string) => (
    <button
      key={k}
      type="button"
      onClick={() => setTab(k)}
      className={
        "px-4 py-2 rounded-md text-sm " +
        (tab === k
          ? "bg-white/10 text-white"
          : "text-white/60 hover:text-white hover:bg-white/5")
      }
      aria-pressed={tab === k}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold">BI CRM</h2>
        <div className="flex gap-2" role="tablist" aria-label="BI CRM tabs">
          {tabBtn("contacts", "Contacts")}
          {tabBtn("companies", "Companies")}
          {tabBtn("outreach", "Outreach")}
          {tabBtn("overview", "Overview")}
        </div>
      </div>

      {tab === "contacts" && <BIContactsList />}
      {tab === "companies" && <BICompaniesList />}
      {tab === "outreach" && <BIOutreach />}

      {tab === "overview" && (
        <div className="space-y-8">
          <section>
            <h3 className="text-xl mb-3">Contacts</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {contacts.map((c) => (
                <div key={c.id} className="bg-brand-surface border border-card rounded-xl p-4">
                  <strong>{c.full_name}</strong>
                  <p>{c.email}</p>
                  <p>{c.phone_e164}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl mb-3">Referrers</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {referrers.map((r) => (
                <div key={r.id} className="bg-brand-surface border border-card rounded-xl p-4">
                  <strong>{r.full_name}</strong>
                  <p>{r.company_name}</p>
                  <p>Status: {r.agreement_status}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl mb-3">Lenders</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lenders.map((l) => (
                <div key={l.id} className="bg-brand-surface border border-card rounded-xl p-4">
                  <strong>{l.rep_full_name}</strong>
                  <p>{l.company_name}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
