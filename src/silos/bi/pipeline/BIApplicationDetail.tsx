import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api";
import ActivityTimeline from "../components/ActivityTimeline";
import BIDocumentList from "./BIDocumentList";

type BIApplicationDetailData = {
  stage: string;
  bankruptcy_flag?: boolean;
  premium_calc?: {
    annualPremium?: number;
  };
};

type CommissionRow = {
  annual_premium_amount: number;
  commission_amount: number;
  status: string;
};

type TabName = "application" | "documents" | "timeline" | "commission";

export default function BIApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<BIApplicationDetailData | null>(null);
  const [tab, setTab] = useState<TabName>("application");

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    if (!id) {
      return;
    }

    const data = await api<BIApplicationDetailData>(`/api/v1/bi/applications/${id}`);
    setApp(data);
  }

  async function changeStage(stage: string) {
    if (!id || !stage) {
      return;
    }

    await api(`/api/v1/bi/applications/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({
        stage,
        actorType: "staff"
      })
    });
    await load();
  }

  if (!id) {
    return <div className="max-w-7xl mx-auto px-6">Invalid application</div>;
  }

  if (!app) {
    return <div className="max-w-7xl mx-auto px-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 bg-brand-surface border border-card rounded-xl p-8 shadow-soft">
      <h1 className="text-2xl font-semibold mb-6">Application Detail</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <button className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium" type="button" onClick={() => setTab("application")}>Application</button>
        <button className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium" type="button" onClick={() => setTab("documents")}>Documents</button>
        <button className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium" type="button" onClick={() => setTab("timeline")}>Timeline</button>
        <button className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium" type="button" onClick={() => setTab("commission")}>Commission</button>
      </div>

      {tab === "application" && (
        <>
          <p>Stage: {app.stage}</p>
          <p>Bankruptcy Flag: {app.bankruptcy_flag ? "Yes" : "No"}</p>
          <p>Premium: ${app.premium_calc?.annualPremium?.toLocaleString() || "-"}</p>

          <h3 className="mt-6 mb-2 text-lg font-semibold">Change Stage</h3>
          <select className="bg-brand-bgAlt border border-card rounded-lg px-3 h-10" defaultValue="" onChange={(e) => void changeStage(e.target.value)}>
            <option value="">Select stage</option>
            <option value="received">Received</option>
            <option value="documents_pending">Documents Pending</option>
            <option value="under_review">Under Review</option>
            <option value="quoted">Quoted</option>
            <option value="bound">Bound</option>
            <option value="declined">Declined</option>
          </select>
        </>
      )}

      {tab === "documents" && <BIDocumentList applicationId={id} />}

      {tab === "timeline" && <ActivityTimeline applicationId={id} />}

      {tab === "commission" && <CommissionTab applicationId={id} />}
    </div>
  );
}

function CommissionTab({ applicationId }: { applicationId: string }) {
  const [row, setRow] = useState<CommissionRow | null>(null);

  useEffect(() => {
    void load();
  }, [applicationId]);

  async function load() {
    const data = await api<CommissionRow>(`/api/bi/commissions/by-application/${applicationId}`);
    setRow(data);
  }

  if (!row) {
    return <div>No commission record</div>;
  }

  return (
    <div className="bg-brand-bgAlt border border-card rounded-xl p-4">
      <p>Premium: ${row.annual_premium_amount}</p>
      <p>Commission (10%): ${row.commission_amount}</p>
      <p>Status: {row.status}</p>
    </div>
  );
}
