import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "@/api";
// BF_NO_OVERVIEW_v41 — Block 41-C — Overview tab removed from drawer.
import ApplicationTab from "@/pages/applications/tabs/ApplicationTab";
import BankingAnalysisTab from "@/pages/applications/tabs/BankingAnalysisTab";
import FinancialsTab from "@/pages/applications/tabs/FinancialsTab";
import DocumentsTab from "@/pages/applications/tabs/DocumentsTab";
import CreditSummaryTab from "@/pages/applications/tabs/CreditSummaryTab";
import NotesTab from "@/pages/applications/tabs/NotesTab";
import LendersTab from "@/pages/applications/tabs/LendersTab";

const TABS = [
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
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "application";
  return (TABS.find((tab) => tab.key === segment)?.key ?? "application") as TabKey;
}

// BF_PORTAL_BLOCK_v173_TAB_STRIP_OVERLAP_v1
// Layout fix for tab labels appearing visually cut by content rising up
// into the tab nav region. Two root causes addressed:
//   1. The previous outer <header> with <h1>{title}</h1> rendered even
//      when the application had not yet loaded, consuming unaccounted
//      vertical space in a flex column that already had height: 100%.
//      Each tab body (ApplicationTab, BankingAnalysisTab, etc.) renders
//      its own h2 title, so the outer header was redundant. Removed.
//   2. The flex column lacked `min-height: 0` on its children, which in
//      Chromium can cause the section's content to spill into the nav
//      when total intrinsic height exceeds the container. The new layout
//      pins the nav with `flex-shrink: 0` so it can never compress, and
//      gives the body section `flex: 1; min-height: 0; overflow-y: auto`
//      so it scrolls inside its own region. This also fixes the mobile
//      tap-target issue — the buttons are no longer occluded.
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

  const tabBody = {
    application: <ApplicationTab application={application} />,
    "banking-analysis": <BankingAnalysisTab applicationId={applicationId} />,
    financials: <FinancialsTab />,
    documents: <DocumentsTab />,
    // BF_CREDIT_SUMMARY_UI_v46 — pass applicationId so the route-rendered
    // CreditSummaryTab works without the legacy drawer store.
    "credit-summary": <CreditSummaryTab applicationId={applicationId} />,
    // BF_NOTES_UI_v49 — pass applicationId so the route-rendered NotesTab works.
    notes: <NotesTab applicationId={applicationId} />,
    // BF_LENDERS_TAB_PROP_v42 — Block 42-B — pass applicationId so the
    // route-rendered LendersTab works without the legacy drawer store.
    lenders: <LendersTab applicationId={applicationId} />,
  }[activeTab];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {error && (
        <div
          style={{
            margin: 0,
            padding: "10px 20px",
            color: "#b91c1c",
            background: "#fef2f2",
            borderBottom: "1px solid #fecaca",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      <nav
        style={{
          display: "flex",
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid #e5e7eb",
          overflowX: "auto",
          background: "#fff",
          flexShrink: 0,
          alignItems: "stretch",
        }}
      >
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
                paddingTop: 6,
                paddingBottom: 8,
                paddingLeft: 4,
                paddingRight: 4,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 14,
                lineHeight: 1.4,
                fontFamily: "inherit",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section
        style={{
          flex: 1,
          minHeight: 0,
          padding: 20,
          overflowY: "auto",
        }}
      >
        {tabBody}
      </section>
    </div>
  );
}
