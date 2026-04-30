import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api";
import ActivityTimeline from "../components/ActivityTimeline";
import BIDocumentList from "./BIDocumentList";
// BI_NOTES_UI_v47
import BINotesList from "./BINotesList";

// BI_PGI_ALIGNMENT_v56
type BIApplicationDetailData = {
  stage: string;
  source_type?: "public" | "lender";
  bankruptcy_flag?: boolean;
  premium_calc?: { annualPremium?: number };
  data?: {
    business_name?: string; lender_name?: string;
    country?: string; naics_code?: string; formation_date?: string;
    loan_amount?: number; pgi_limit?: number;
    annual_revenue?: number; ebitda?: number; total_debt?: number;
    monthly_debt_service?: number; collateral_value?: number; enterprise_value?: number;
    bankruptcy_history?: boolean; insolvency_history?: boolean; judgment_history?: boolean;
  };
  guarantor_name?: string; guarantor_email?: string;
};

type CommissionRow = {
  annual_premium_amount: number;
  commission_amount: number;
  status: string;
};

// BI_NOTES_UI_v47 — Notes tab added per ruling 1 (BI silo has Notes tab).
type TabName = "application" | "documents" | "notes" | "timeline" | "commission";

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

  async function submitToCarrier() {
    if (!id) return;
    if (!confirm("Submit this application to the carrier? This will lock the application.")) return;
    try {
      const res = await fetch(`/api/v1/bi/applications/${id}/submit-to-carrier`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Submit failed: ${body?.error ?? res.status}`);
        return;
      }
      await load();
      alert("Submitted to carrier.");
    } catch (e) {
      alert(`Submit failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  async function changeStage(stage: string) {
    if (!id || !stage) {
      return;
    }

    await api(`/api/v1/bi/pipeline/${id}/stage`, {
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
        {/* BI_NOTES_UI_v47 */}
        <button className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium" type="button" onClick={() => setTab("notes")}>Notes</button>
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

          <div className="mt-6 border-t border-white/10 pt-4">
            <h3 className="text-lg font-semibold mb-3">PGI Application Data</h3>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <Row k="Business" v={app.data?.business_name} />
              <Row k="Lender" v={app.data?.lender_name} />
              <Row k="Guarantor" v={app.guarantor_name} />
              <Row k="Guarantor email" v={app.guarantor_email} />
              <Row k="Country" v={app.data?.country} />
              <Row k="NAICS" v={app.data?.naics_code} />
              <Row k="Formation date" v={app.data?.formation_date} />
              <Row k="Loan amount" v={app.data?.loan_amount} />
              <Row k="PGI limit" v={app.data?.pgi_limit} />
              <Row k="Annual revenue" v={app.data?.annual_revenue} />
              <Row k="EBITDA" v={app.data?.ebitda} />
              <Row k="Total debt" v={app.data?.total_debt} />
              <Row k="Monthly debt service" v={app.data?.monthly_debt_service} />
              <Row k="Collateral value" v={app.data?.collateral_value} />
              <Row k="Enterprise value" v={app.data?.enterprise_value} />
              <Row k="Bankruptcy history" v={app.data?.bankruptcy_history} />
              <Row k="Insolvency history" v={app.data?.insolvency_history} />
              <Row k="Judgment history" v={app.data?.judgment_history} />
            </div>
            {app.source_type === "public" && app.stage === "under_review" && (
              <button
                type="button"
                onClick={() => void submitToCarrier()}
                className="mt-6 rounded bg-emerald-600 hover:bg-emerald-700 px-6 py-3 font-semibold text-white"
              >
                Submit to Carrier
              </button>
            )}
            {app.source_type === "lender" && (
              <p className="mt-4 text-sm text-white/60">This application was submitted by a lender and forwarded directly to PGI.</p>
            )}
          </div>
        </>
      )}

      {tab === "documents" && <BIDocumentList applicationId={id} />}

      {/* BI_NOTES_UI_v47 */}
      {tab === "notes" && <BINotesList applicationId={id} />}

      {tab === "timeline" && <ActivityTimeline applicationId={id} />}

      {tab === "commission" && <CommissionTab applicationId={id} />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: unknown }) {
  return <div><span className="text-white/60">{k}: </span><span className="font-mono">{v == null || v === "" ? "–" : String(v)}</span></div>;
}

function CommissionTab({ applicationId }: { applicationId: string }) {
  const [row, setRow] = useState<CommissionRow | null>(null);

  useEffect(() => {
    void load();
  }, [applicationId]);

  async function load() {
    const data = await api<CommissionRow>(`/api/v1/bi/commissions/by-application/${applicationId}`);
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
