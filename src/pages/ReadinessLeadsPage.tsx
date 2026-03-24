import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { convertReadinessLeadToApplication, fetchReadinessLeads } from "@api/readiness";

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="drawer-kv-list__item">
    <dt>{label}</dt>
    <dd>{value || "-"}</dd>
  </div>
);

const ReadinessLeadsPage = () => {
  const navigate = useNavigate();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const leadsQuery = useQuery({
    queryKey: ["portal", "readiness-leads"],
    queryFn: fetchReadinessLeads,
    retry: false
  });

  const selectedLead = useMemo(
    () => leadsQuery.data?.find((lead) => lead.id === selectedLeadId) ?? null,
    [leadsQuery.data, selectedLeadId]
  );

  const convertMutation = useMutation({
    mutationFn: (leadId: string) => convertReadinessLeadToApplication(leadId),
    onSuccess: ({ applicationId }) => {
      navigate(`/applications/${applicationId}`);
    }
  });

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Readiness Leads</h1>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Company Name</th>
              <th className="px-3 py-2">Contact Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Industry</th>
              <th className="px-3 py-2">Years</th>
              <th className="px-3 py-2">Annual Revenue</th>
              <th className="px-3 py-2">Monthly Revenue</th>
              <th className="px-3 py-2">A/R</th>
              <th className="px-3 py-2">Collateral</th>
              <th className="px-3 py-2">Created Date</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(leadsQuery.data ?? []).map((lead) => (
              <tr
                key={lead.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                onClick={() => setSelectedLeadId(lead.id)}
              >
                <td className="px-3 py-2">{lead.companyName || "-"}</td>
                <td className="px-3 py-2">{lead.contactName || "-"}</td>
                <td className="px-3 py-2">{lead.phone || "-"}</td>
                <td className="px-3 py-2">{lead.email || "-"}</td>
                <td className="px-3 py-2">{lead.source || "readiness"}</td>
                <td className="px-3 py-2">{lead.tags.join(", ") || "-"}</td>
                <td className="px-3 py-2">{lead.industry || "-"}</td>
                <td className="px-3 py-2">{lead.yearsInBusiness ?? "-"}</td>
                <td className="px-3 py-2">{lead.annualRevenue ?? "-"}</td>
                <td className="px-3 py-2">{lead.monthlyRevenue ?? "-"}</td>
                <td className="px-3 py-2">{lead.accountsReceivable ?? "-"}</td>
                <td className="px-3 py-2">{lead.availableCollateral ?? "-"}</td>
                <td className="px-3 py-2">{formatDate(lead.createdAt)}</td>
                <td className="px-3 py-2">{lead.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leadsQuery.isLoading ? <p>Loading readiness leads…</p> : null}
      {leadsQuery.error ? <p className="text-red-600">Unable to load readiness leads.</p> : null}

      {selectedLead ? (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setSelectedLeadId(null)} role="presentation">
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Lead Details</h2>
              <button className="ui-button ui-button--secondary" onClick={() => setSelectedLeadId(null)} type="button">
                Close
              </button>
            </div>
            <dl className="drawer-kv-list space-y-2">
              <DetailRow label="Company Name" value={selectedLead.companyName} />
              <DetailRow label="Contact Name" value={selectedLead.contactName} />
              <DetailRow label="Phone" value={selectedLead.phone} />
              <DetailRow label="Email" value={selectedLead.email} />
              <DetailRow label="Source" value={selectedLead.source || "readiness"} />
              <DetailRow label="Tags" value={selectedLead.tags.join(", ")} />
              <DetailRow label="Industry" value={selectedLead.industry} />
              <DetailRow label="Years in Business" value={selectedLead.yearsInBusiness ?? "-"} />
              <DetailRow label="Annual Revenue" value={selectedLead.annualRevenue ?? "-"} />
              <DetailRow label="Monthly Revenue" value={selectedLead.monthlyRevenue ?? "-"} />
              <DetailRow label="Accounts Receivable" value={selectedLead.accountsReceivable ?? "-"} />
              <DetailRow label="Available Collateral" value={selectedLead.availableCollateral ?? "-"} />
              <DetailRow label="Created Date" value={formatDate(selectedLead.createdAt)} />
              <DetailRow label="Status" value={selectedLead.status} />
            </dl>
            <div className="mt-3">
              <h3 className="font-semibold">Activity Log</h3>
              <ul className="list-disc pl-5 text-sm text-slate-600">
                {selectedLead.activityLog.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
                {selectedLead.activityLog.length === 0 ? <li>No activity yet.</li> : null}
              </ul>
            </div>

            <div className="mt-6">
              <button
                className="ui-button"
                disabled={convertMutation.isPending}
                onClick={() => convertMutation.mutate(selectedLead.id)}
                type="button"
              >
                {convertMutation.isPending ? "Converting…" : "Convert to Application"}
              </button>
              {convertMutation.error ? <p className="mt-2 text-sm text-red-600">Unable to convert this lead.</p> : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default ReadinessLeadsPage;
