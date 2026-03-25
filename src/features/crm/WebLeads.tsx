import { useEffect, useState } from "react";
import { buildUrl } from "@/lib/api";

export default function WebLeads() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetch (buildUrl("/crm/web-leads"))
      .then((res) => res.json())
      .then((data) => setLeads(data.leads || []));
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
