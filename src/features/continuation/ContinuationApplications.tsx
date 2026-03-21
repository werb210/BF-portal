import { useEffect, useState } from "react";
import { buildUrl } from "@/lib/api";

interface ContinuationApp {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  industry: string;
  yearsInBusiness?: string;
  monthlyRevenue?: string;
  annualRevenue?: string;
  arOutstanding?: string;
  availableCollateral?: string;
  createdAt: string;
  status?: "readiness" | "application";
  linkedLeadId?: string;
}

const buildLeadId = (app: ContinuationApp) => `lead-${app.email.toLowerCase()}`;

export default function ContinuationApplications() {
  const [apps, setApps] = useState<ContinuationApp[]>([]);

  useEffect(() => {
    fetch(buildUrl("/continuation"))
      .then((res) => res.json())
      .then((data: ContinuationApp[]) => {
        setApps(
          (Array.isArray(data) ? data : []).map((app) => ({
            ...app,
            status: app.status ?? "readiness",
            linkedLeadId: app.linkedLeadId ?? buildLeadId(app)
          }))
        );
      });
  }, []);

  function convertToApplication(id: string) {
    setApps((previous) =>
      previous.map((app) =>
        app.id === id
          ? {
              ...app,
              status: "application"
            }
          : app
      )
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Capital Readiness / Continuations</h1>

      <div className="grid gap-4">
        {apps.map((app) => (
          <div key={app.id} className="rounded border bg-white p-4 shadow">
            <div className="text-lg font-semibold">{app.companyName}</div>
            <div>{app.fullName}</div>
            <div>{app.email}</div>
            <div>{app.phone}</div>
            <div className="mt-2 text-sm text-gray-500">Industry: {app.industry}</div>
            <div className="mt-1 text-sm text-gray-500">Status: {app.status}</div>
            <div className="text-sm text-gray-500">Linked CRM lead: {app.linkedLeadId}</div>
            <div className="mt-2 text-xs text-slate-500">
              KYC preserved: {app.yearsInBusiness ?? "n/a"} years · Revenue {app.monthlyRevenue ?? app.annualRevenue ?? "n/a"}
            </div>
            <button
              type="button"
              onClick={() => convertToApplication(app.id)}
              className="mt-3 rounded border border-slate-300 px-3 py-1 text-sm"
              disabled={app.status === "application"}
            >
              {app.status === "application" ? "Converted" : "Convert to Application"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
