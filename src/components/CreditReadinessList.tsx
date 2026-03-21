import { useEffect, useMemo, useState } from "react";
import { convertReadinessToApplication, fetchCreditReadinessLeads } from "@api/crm";
import type { CRMLead } from "@/types/crm";

const tierOptions = [
  "Institutional Profile",
  "Strong Non-Bank Profile",
  "Structured Opportunity",
  "Early Stage"
] as const;

export default function CreditReadinessList() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [filter, setFilter] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCreditReadinessLeads().then(setLeads).catch(() => setLeads([]));
  }, []);

  async function convertToApplication(id: string) {
    setConvertingId(id);
    try {
      await convertReadinessToApplication(id);
      alert("Converted to application");
      setLeads((previous) => previous.filter((lead) => lead.id !== id));
    } finally {
      setConvertingId(null);
    }
  }

  const filteredLeads = useMemo(
    () => leads.filter((lead) => lead.type === "credit_readiness" && (!filter || lead.tier === filter)),
    [filter, leads]
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="mr-2 text-sm font-medium" htmlFor="credit-readiness-tier-filter">
          Tier
        </label>
        <select
          className="rounded border border-slate-300 px-3 py-2"
          id="credit-readiness-tier-filter"
          onChange={(event) => setFilter(event.target.value)}
          value={filter}
        >
          <option value="">All</option>
          {tierOptions.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </div>

      {filteredLeads.map((lead) => (
        <div key={lead.id} className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-white">
          <div className="flex justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{lead.companyName}</h3>
              <p className="text-sm text-slate-400">
                {lead.contactName} • {lead.email}
              </p>
              <p className="mt-1 inline-block rounded bg-indigo-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide">
                Credit Readiness
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-400">Score: {lead.score ?? "-"}</div>
              <div className="font-medium">{lead.tier || "Unassigned"}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-300 md:grid-cols-2">
            <div>Industry: {lead.industry || "-"}</div>
            <div>Years: {lead.yearsInBusiness || "-"}</div>
            <div>Annual: {lead.annualRevenue || "-"}</div>
            <div>Monthly: {lead.monthlyRevenue || "-"}</div>
            <div>AR: {lead.arBalance || "-"}</div>
            <div>Collateral: {lead.availableCollateral || "-"}</div>
            <div>Phone: {lead.phone || "-"}</div>
            <div>Created: {lead.createdAt}</div>
          </div>

          <div className="mt-6">
            <button
              className="rounded bg-white px-4 py-2 text-black disabled:cursor-not-allowed disabled:opacity-70"
              disabled={convertingId === lead.id}
              onClick={() => convertToApplication(lead.id)}
              type="button"
            >
              {convertingId === lead.id ? "Converting..." : "Convert to Application"}
            </button>
          </div>
        </div>
      ))}

      {filteredLeads.length === 0 ? <p className="text-sm text-slate-500">No readiness leads found.</p> : null}
    </div>
  );
}
