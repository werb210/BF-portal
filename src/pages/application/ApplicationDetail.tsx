import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "@/api";
// BF_NO_OVERVIEW_v41 — Block 41-C — Overview tab removed from drawer.
import ApplicationTab from "@/pages/applications/tabs/ApplicationTab";
import BankingAnalysisTab from "@/pages/applications/tabs/BankingAnalysisTab";
import FinancialsTab from "@/pages/applications/tabs/FinancialsTab";
import DocumentsTab from "@/pages/applications/tabs/DocumentsTab";
import CreditSummaryTab from "@/pages/applications/tabs/CreditSummaryTab";
import RequestItemsTab from "@/pages/applications/tabs/RequestItemsTab"; // BF_PORTAL_BLOCK_v821_REQUEST_ITEMS_TAB
import NotesTab from "@/pages/applications/tabs/NotesTab";
import LendersTab from "@/pages/applications/tabs/LendersTab";

const TABS = [
  { key: "application", label: "Application" },
  { key: "banking-analysis", label: "Banking Analysis" },
  { key: "financials", label: "Financials" },
  { key: "documents", label: "Documents" },
  { key: "credit-summary", label: "Credit Summary" },
  { key: "request-items", label: "Request Items" }, // BF_PORTAL_BLOCK_v821_REQUEST_ITEMS_TAB
  { key: "notes", label: "Notes" },
  { key: "lenders", label: "Lenders" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function activeTabFromPath(pathname: string): TabKey {
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "application";
  return (TABS.find((tab) => tab.key === segment)?.key ?? "application") as TabKey;
}

// BF_PORTAL_BLOCK_v173_TAB_STRIP_OVERLAP_v1
// BF_PORTAL_BLOCK_v174_APPLICATION_TAB_SEMANTIC_GROUPS_v1
// Layout fix (v173): drop redundant <header>; pin nav with flex-shrink: 0;
// give body section flex: 1, min-height: 0, overflow-y: auto so it scrolls
// in its own region without bleeding into the nav strip.
// Data wiring (v174): switched to /api/applications/:id/details — that
// handler flattens metadata into {overview, businessDetails, applicantDetails,
// owners, financialProfile, rawPayload, ...} which is the shape the new
// ApplicationTab consumes. The legacy /:id endpoint returned the raw DB row
// where businessDetails/applicantDetails/etc. don't exist, so the old tab
// rendered "—" for nearly every field.
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
      .get(`/api/applications/${applicationId}/details`)
      .then((payload: any) => setApplication(payload?.data ?? payload?.application ?? payload ?? null))
      .catch((err: any) => setError(err?.message ?? "Could not load application."));
  }, [applicationId]);

  // BF_PORTAL_BLOCK_v187_TABS_PROP_WIRING_v1 — pass applicationId to FinancialsTab and DocumentsTab
  const tabBody = {
    application: <ApplicationTab application={application} />,
    "banking-analysis": <BankingAnalysisTab applicationId={applicationId} />,
    financials: <FinancialsTab applicationId={applicationId} />,
    documents: <DocumentsTab applicationId={applicationId} />,
    "credit-summary": <CreditSummaryTab applicationId={applicationId} />,
    "request-items": <RequestItemsTab applicationId={applicationId} />,
    notes: <NotesTab applicationId={applicationId} />,
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

      {/* BF_PORTAL_BLOCK_v188_PIPELINE_NAV_AND_AUTO_REVIEW_v1 — back to pipeline */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--ui-border)",
          background: "var(--ui-surface-strong)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/pipeline")}
          style={{
            border: 0,
            background: "transparent",
            color: "var(--ui-accent-blue)",
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
            fontWeight: 500,
          }}
        >
          ← Back to pipeline
        </button>
      </div>

      <nav
        style={{
          display: "flex",
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid var(--ui-border)",
          overflowX: "auto",
          background: "var(--ui-surface-strong)",
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
                borderBottom: active ? "2px solid var(--ui-accent-blue)" : "2px solid transparent",
                background: "transparent",
                color: active ? "var(--ui-accent-blue)" : "#334155",
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
