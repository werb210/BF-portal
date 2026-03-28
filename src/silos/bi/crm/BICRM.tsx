import { useEffect, useState } from "react";
import { biGetContacts, biGetReferrers, biGetLenders } from "@/api/biClient";

export default function BICRM() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setContacts(await biGetContacts());
    setReferrers(await biGetReferrers());
    setLenders(await biGetLenders());
  }

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-8">
      <h2 className="text-3xl font-semibold">BI CRM</h2>

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
  );
}
