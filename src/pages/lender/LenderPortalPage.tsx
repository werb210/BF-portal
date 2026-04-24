import { useEffect, useState } from "react";
import { api } from "@/api";
import { PGI_STAGE_LABEL } from "@/contracts/pgiStages";
import LenderApplicationForm from "./LenderApplicationForm";

type LenderApp = {
  id: string;
  stage: string;
  primary_contact_name: string | null;
  company_name: string | null;
  premium_calc: { annualPremium?: number } | null;
  created_at: string;
};

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("lender_token")}` };
}

export default function LenderPortalPage() {
  const [apps, setApps] = useState<LenderApp[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await api<LenderApp[]>("/api/v1/bi/lender/applications", {
        headers: authHeader()
      });
      setApps(Array.isArray(data) ? data : []);
    } catch {
      setApps([]);
    }
  }

  return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lender Portal</h1>
        <button className="ui-button ui-button--primary" onClick={() => setShowForm(true)}>
          Add Application
        </button>
      </div>

      <section className="drawer-section">
        <div className="drawer-section__title">Your Applications</div>
        <div className="space-y-2">
          {apps.length === 0 && <div className="text-sm text-slate-500">No applications yet.</div>}
          {apps.map((app) => (
            <article key={app.id} className="rounded border p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {app.company_name || app.primary_contact_name || "Application"}
                </div>
                <div className="text-sm">
                  {PGI_STAGE_LABEL[app.stage] || app.stage}
                  {" · "}
                  Premium: {app.premium_calc?.annualPremium
                    ? `$${app.premium_calc.annualPremium.toLocaleString()}`
                    : "—"}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(app.created_at).toLocaleDateString()}
              </div>
            </article>
          ))}
        </div>
      </section>

      {showForm && (
        <LenderApplicationForm
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
