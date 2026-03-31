import { useEffect, useState } from "react";
import api from "@/lib/api";

type WebsiteLead = {
  id?: string;
  company?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
};

export default function WebsiteLeadsPage() {
  const [leads, setLeads] = useState<WebsiteLead[]>([]);

  useEffect(() => {
    api.get("/admin/website-leads").then((res) => {
      setLeads(res.data || []);
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Website Leads</h1>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <tr key={lead.id ?? i} className="border-t">
                <td className="p-3">{lead.company}</td>
                <td className="p-3">
                  {lead.firstName} {lead.lastName}
                </td>
                <td className="p-3">{lead.email}</td>
                <td className="p-3">{lead.phone}</td>
                <td className="p-3">{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
