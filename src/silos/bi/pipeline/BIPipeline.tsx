import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

type BIApplication = {
  id: string;
  stage: string;
  bankruptcy_flag?: boolean;
  primary_contact_name?: string;
  premium_calc?: {
    annualPremium?: number;
  };
};

const stages = [
  "new_application",
  "documents_pending",
  "under_review",
  "approved",
  "declined",
  "policy_issued"
];

export default function BIPipeline() {
  const [apps, setApps] = useState<BIApplication[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const data = await api<BIApplication[]>("/api/bi/applications");
    setApps(data);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stages.map((stage) => (
        <div key={stage} className="bg-brand-bgAlt border border-card rounded-xl p-4">
          <h3 className="text-xs text-white/70 mb-3">{stage.replace("_", " ").toUpperCase()}</h3>
          {apps
            .filter((a) => a.stage === stage)
            .map((app) => (
              <div
                key={app.id}
                className="bg-brand-surface border border-card rounded-xl p-3 mb-3"
                onClick={() => navigate(`/bi/pipeline/${app.id}`)}
                style={{ cursor: "pointer" }}
              >
                <p>
                  <strong>{app.primary_contact_name || "Applicant"}</strong>
                </p>
                <p>${app.premium_calc?.annualPremium || "-"}</p>
                {app.bankruptcy_flag && (
                  <span className="text-xs text-brand-accent">⚠ Bankruptcy</span>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
