import { useEffect, useState } from "react";
import api from "@/api/client";

export default function CreditReadinessLeads() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const res = await api.get("/credit-readiness/leads");
    setLeads(Array.isArray(res.data) ? res.data : []);
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Capital Readiness Leads</h1>

      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="rounded border p-4">
            <div><strong>Company:</strong> {lead.companyName}</div>
            <div><strong>Name:</strong> {lead.fullName}</div>
            <div><strong>Email:</strong> {lead.email}</div>
            <div><strong>Phone:</strong> {lead.phone}</div>
            <div><strong>Industry:</strong> {lead.industry}</div>
            <div><strong>Revenue:</strong> {lead.monthlyRevenue}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
