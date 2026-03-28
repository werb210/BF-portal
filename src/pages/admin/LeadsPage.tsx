import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchLeads } from "@/api/crm";
import type { Lead, LeadMetadata, LeadSource, LeadStatus } from "@/types/crm";

type ApiLead = {
  id?: string;
  company?: string;
  companyName?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  linkedApplicationId?: string;
  createdAt?: string;
  tags?: string[];
  productInterest?: string;
  industry?: string;
  industryInterest?: string;
  metadata?: LeadMetadata;
  yearsInBusiness?: string | number;
  annualRevenue?: string | number;
  monthlyRevenue?: string | number;
  requestedAmount?: string | number;
  creditScoreRange?: string | number;
  revenue?: string | number;
  ar?: string | number;
  arBalance?: string | number;
  accountsReceivable?: string | number;
  availableCollateral?: string | number;
  score?: string | number;
  pendingApplicationId?: string;
};

type LeadFilter = "all" | "website" | "credit_readiness_bridge";
type LeadTab = "overview" | "comms";

const normalizeSource = (source?: string): LeadSource => {
  if (
    source === "website_contact" ||
    source === "website_credit_check" ||
    source === "chat_start" ||
    source === "startup_interest" ||
    source === "credit_readiness" ||
    source === "manual" ||
    source === "website" ||
    source === "credit_readiness_bridge"
  ) {
    return source;
  }
  return "website_contact";
};

const normalizeStatus = (status?: string): LeadStatus => {
  if (status === "new" || status === "contacted" || status === "converted") {
    return status;
  }
  return "new";
};

const toLead = (lead: ApiLead, index: number): Lead => {
  const firstName = lead.first_name ?? lead.firstName ?? "";
  const lastName = lead.last_name ?? lead.lastName ?? "";
  const fullName = lead.fullName ?? `${firstName} ${lastName}`.trim();

  return {
    id: lead.id ?? `${lead.email ?? "lead"}-${index}`,
    companyName: lead.companyName ?? lead.company ?? "-",
    fullName: fullName || "-",
    email: lead.email ?? "-",
    phone: lead.phone ?? "-",
    industry: lead.industry,
    productInterest: lead.productInterest,
    industryInterest: lead.industryInterest,
    tags: lead.tags ?? [],
    source: normalizeSource(lead.source),
    status: normalizeStatus(lead.status),
    createdAt: lead.createdAt ?? new Date().toISOString(),
    metadata: {
      yearsInBusiness: lead.metadata?.yearsInBusiness ?? lead.yearsInBusiness,
      annualRevenue: lead.metadata?.annualRevenue ?? lead.annualRevenue,
      monthlyRevenue: lead.metadata?.monthlyRevenue ?? lead.monthlyRevenue,
      requestedAmount: lead.metadata?.requestedAmount ?? lead.requestedAmount,
      creditScoreRange: lead.metadata?.creditScoreRange ?? lead.creditScoreRange,
      revenue: lead.metadata?.revenue ?? lead.revenue,
      accountsReceivable: lead.metadata?.accountsReceivable ?? lead.accountsReceivable ?? lead.ar ?? lead.arBalance,
      availableCollateral: lead.metadata?.availableCollateral ?? lead.availableCollateral,
      score: lead.metadata?.score ?? lead.score
    },
    linkedApplicationId: lead.linkedApplicationId,
    pendingApplicationId: lead.pendingApplicationId
  };
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<LeadTab>("overview");

  const loadLeads = async () => {
    try {
      const data = await fetchLeads();
      const payload = Array.isArray(data) ? data : (data.leads ?? []);
      setLeads(payload.map(toLead));
    } catch {
      setLeads([]);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadLeads();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const websiteLeads = useMemo(
    () => leads.filter((l) => l.source === "website_contact" || l.source === "website_credit_check" || l.source === "website"),
    [leads]
  );

  const creditReadinessBridgeLeads = useMemo(() => leads.filter((l) => l.source === "credit_readiness_bridge"), [leads]);

  const visibleLeads = useMemo(() => {
    if (filter === "website") {
      return websiteLeads;
    }
    if (filter === "credit_readiness_bridge") {
      return creditReadinessBridgeLeads;
    }
    return leads;
  }, [creditReadinessBridgeLeads, filter, leads, websiteLeads]);

  if (user?.role !== "Admin") {
    return <div>Access denied</div>;
  }

  return (
    <div className="page space-y-4">
      <h1 className="text-xl font-semibold">Website Leads</h1>
      <div className="flex items-center gap-2">
        <label htmlFor="lead-filter" className="text-sm text-slate-600">Filter</label>
        <select
          id="lead-filter"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          value={filter}
          onChange={(event) => setFilter(event.target.value as LeadFilter)}
        >
          <option value="all">All Leads</option>
          <option value="website">Website Leads</option>
          <option value="credit_readiness_bridge">
            Credit Readiness Leads
          </option>
        </select>
      </div>
      <table className="min-w-full divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left">Company Name</th>
            <th className="px-3 py-2 text-left">Full Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Phone</th>
            <th className="px-3 py-2 text-left">Years</th>
            <th className="px-3 py-2 text-left">Annual Revenue</th>
            <th className="px-3 py-2 text-left">Monthly Revenue</th>
            <th className="px-3 py-2 text-left">A/R</th>
            <th className="px-3 py-2 text-left">Collateral</th>
            <th className="px-3 py-2 text-left">Product</th>
            <th className="px-3 py-2 text-left">Industry</th>
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-left">Tags</th>
          </tr>
        </thead>
        <tbody>
          {visibleLeads.map((lead) => (
            <tr
              key={lead.id}
              className={`cursor-pointer border-t border-slate-100 ${lead.source === "credit_readiness_bridge" && lead.status === "converted" ? "opacity-50" : ""}`}
              onClick={() => {
                setSelectedLead(lead);
                setActiveTab("overview");
              }}
            >
              <td className="px-3 py-2">{lead.companyName}</td>
              <td className="px-3 py-2">{lead.fullName}</td>
              <td className="px-3 py-2">{lead.email}</td>
              <td className="px-3 py-2">{lead.phone}</td>
              <td className="px-3 py-2">{lead.metadata?.yearsInBusiness ?? "-"}</td>
              <td className="px-3 py-2">{lead.metadata?.annualRevenue ?? "-"}</td>
              <td className="px-3 py-2">{lead.metadata?.monthlyRevenue ?? "-"}</td>
              <td className="px-3 py-2">{lead.metadata?.accountsReceivable ?? "-"}</td>
              <td className="px-3 py-2">{lead.metadata?.availableCollateral ?? "-"}</td>
              <td className="px-3 py-2">{lead.productInterest ?? "-"}</td>
              <td className="px-3 py-2">{lead.industryInterest ?? lead.industry ?? "-"}</td>
              <td className="px-3 py-2">
                {lead.source === "credit_readiness_bridge" && (
                  <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded">
                    Credit Readiness
                  </span>
                )}
                {lead.source !== "credit_readiness_bridge" && (
                  <span className={`badge badge-${lead.source}`}>{lead.source.replace("_", " ")}</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {lead.tags?.map((tag) => (
                    <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{tag}</span>
                  ))}
                  {lead.tags?.includes("startup_interest") && (
                    <span className="rounded bg-yellow-500 px-2 py-1 text-xs text-black">Startup</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedLead && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lead Details</h2>
            <button onClick={() => setSelectedLead(null)}>Close</button>
          </div>

          <div className="mb-4 flex gap-2 border-b border-slate-200 pb-2">
            <button className={activeTab === "overview" ? "font-semibold" : "text-slate-600"} onClick={() => setActiveTab("overview")}>Overview</button>
            <button className={activeTab === "comms" ? "font-semibold" : "text-slate-600"} onClick={() => setActiveTab("comms")}>Comms</button>
          </div>

          {activeTab === "overview" && (
            <>
              <div><strong>Company:</strong> {selectedLead.companyName}</div>
              <div><strong>Name:</strong> {selectedLead.fullName}</div>
              <div><strong>Email:</strong> {selectedLead.email}</div>
              <div><strong>Phone:</strong> {selectedLead.phone}</div>

              {selectedLead.tags?.includes("startup_interest") && (
                <div className="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs inline-block">
                  Startup Interest
                </div>
              )}

              <h3 className="mt-4 font-semibold">Capital Readiness Data</h3>
              <ul className="space-y-1 text-sm">
                <li>Years in Business: {selectedLead.metadata?.yearsInBusiness ?? "-"}</li>
                <li>Annual Revenue: {selectedLead.metadata?.annualRevenue ?? "-"}</li>
                <li>Monthly Revenue: {selectedLead.metadata?.monthlyRevenue ?? "-"}</li>
                <li>Requested Amount: {selectedLead.metadata?.requestedAmount ?? "-"}</li>
                <li>Credit Score Range: {selectedLead.metadata?.creditScoreRange ?? "-"}</li>
              </ul>

              {selectedLead.source === "credit_readiness_bridge" && (
                <div className="mt-6 border-t border-slate-700 pt-4">
                  <h3 className="text-sm font-semibold mb-3 text-slate-300">
                    Credit Readiness Snapshot
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-400">
                    <div>Industry</div><div>{selectedLead.industry ?? "-"}</div>
                    <div>Years in Business</div><div>{selectedLead.metadata?.yearsInBusiness ?? "-"}</div>
                    <div>Annual Revenue</div><div>{selectedLead.metadata?.annualRevenue ?? "-"}</div>
                    <div>Monthly Revenue</div><div>{selectedLead.metadata?.monthlyRevenue ?? "-"}</div>
                    <div>Accounts Receivable</div><div>{selectedLead.metadata?.accountsReceivable ?? "-"}</div>
                    <div>Available Collateral</div><div>{selectedLead.metadata?.availableCollateral ?? "-"}</div>
                  </div>
                </div>
              )}

              {selectedLead.linkedApplicationId && (
                <div className="mt-4">
                  <a
                    href={`/pipeline/${selectedLead.linkedApplicationId}`}
                    className="text-blue-400 hover:underline text-sm"
                  >
                    View Application
                  </a>
                </div>
              )}

              {selectedLead.pendingApplicationId && (
                <div className="bg-green-100 text-green-800 p-2 mt-4">
                  User started Credit Readiness. Application continuation available.
                </div>
              )}

              {selectedLead.source === "website_contact" && (
                <div className="text-sm text-green-600">SMS notification sent to intake specialist.</div>
              )}
              {selectedLead.source === "credit_readiness" && (
                <span className="rounded bg-gray-200 px-2 py-1 text-xs">
                  Credit Readiness
                </span>
              )}
            </>
          )}

          {activeTab === "comms" && (
            <div className="text-sm text-gray-600">Live Chat + Issue Reports will appear here.</div>
          )}
        </div>
      )}
    </div>
  );
}
