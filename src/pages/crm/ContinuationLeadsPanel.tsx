import { useEffect, useState } from "react";
import { fetchContinuationLeads } from "@/api/crm";

type ContinuationLead = {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  industry: string;
};

export default function ContinuationLeadsPanel() {
  const [leads, setLeads] = useState<ContinuationLead[]>([]);

  useEffect(() => {
    void fetchContinuationLeads().then((data) => setLeads(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Website Continuations</h2>

      {leads.map((l) => (
        <div key={l.id} className="rounded border bg-neutral-900 p-4 text-white">
          <div className="font-semibold">{l.companyName}</div>
          <div className="text-sm opacity-80">
            {l.fullName} · {l.email} · {l.phone}
          </div>
          <div className="mt-2 text-xs">Industry: {l.industry}</div>
        </div>
      ))}
    </div>
  );
}
