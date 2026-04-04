import { useEffect, useState } from "react";
import { api } from "@/api";

export default function WebLeads() {
  const [leads, setLeads] = useState<Array<{ id: string; companyName?: string; firstName?: string; lastName?: string; email?: string; phone?: string }>>([]);

  useEffect(() => {
    api<{ leads?: Array<{ id: string; companyName?: string; firstName?: string; lastName?: string; email?: string; phone?: string }> }>("/api/crm/web-leads")
      .then((result) => setLeads(result.leads || []));
  }, []);

  return (
    <div>
      <h2>Website Leads</h2>
      {leads.map((l) => (
        <div key={l.id} style={{ padding: 12 }}>
          <div>{l.companyName}</div>
          <div>
            {l.firstName} {l.lastName}
          </div>
          <div>{l.email}</div>
          <div>{l.phone}</div>
        </div>
      ))}
    </div>
  );
}
