import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "@/api";
import OverviewTab from "@/pages/applications/tabs/OverviewTab";
import ApplicationTab from "@/pages/applications/tabs/ApplicationTab";
import BankingAnalysisTab from "@/pages/applications/tabs/BankingAnalysisTab";
import FinancialsTab from "@/pages/applications/tabs/FinancialsTab";
import DocumentsTab from "@/pages/applications/tabs/DocumentsTab";
import CreditSummaryTab from "@/pages/applications/tabs/CreditSummaryTab";
import NotesTab from "@/pages/applications/tabs/NotesTab";
import LendersTab from "@/pages/applications/tabs/LendersTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "application", label: "Application" },
  { key: "banking-analysis", label: "Banking Analysis" },
  { key: "financials", label: "Financials" },
  { key: "documents", label: "Documents" },
  { key: "credit-summary", label: "Credit Summary" },
  { key: "notes", label: "Notes" },
  { key: "lenders", label: "Lenders" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function activeTabFromPath(pathname: string): TabKey {
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "overview";
  return (TABS.find((tab) => tab.key === segment)?.key ?? "overview") as TabKey;
}

export default function ApplicationDetail({ applicationId: propId }: { applicationId?: string }) {
  const { id: routeId } = useParams<{ id: string }>();
  const applicationId = propId ?? routeId ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTab = activeTabFromPath(location.pathname);

  useEffect(() => {
    if (!applicationId) return;
    setError(null);
    api
      .get(`/api/applications/${applicationId}`)
      .then((payload: any) => setApplication(payload?.application ?? payload?.data ?? payload ?? null))
      .catch((err: any) => setError(err?.message ?? "Could not load application."));
  }, [applicationId]);

  const title = useMemo(
    () => String(application?.business_legal_name ?? application?.business_name ?? application?.name ?? "Application"),
    [application],
  );

  const tabBody = {
    overview: <OverviewTab application={application} />,
    application: <ApplicationTab application={application} />,
    "banking-analysis": <BankingAnalysisTab />,
    financials: <FinancialsTab />,
    documents: <DocumentsTab />,
    "credit-summary": <CreditSummaryTab />,
    notes: <NotesTab />,
    lenders: <LendersTab />,
  }[activeTab];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {error && <p style={{ margin: "8px 0 0", color: "#b91c1c" }}>{error}</p>}
      </header>

      <nav style={{ display: "flex", gap: 16, padding: "12px 20px", borderBottom: "1px solid #e5e7eb", overflowX: "auto" }}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(`/applications/${applicationId}/${tab.key}`)}
              style={{
                border: 0,
                borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
                background: "transparent",
                color: active ? "#2563eb" : "#334155",
                fontWeight: active ? 700 : 500,
                paddingBottom: 8,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section style={{ padding: 20 }}>{tabBody}</section>
    </div>
  );
}
