import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom"; // BF_PORTAL_NOTE_DEEPLINK_v1
import { useMutation, useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import AppLoading from "@/components/layout/AppLoading";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ApplicationCard from "@/pages/applications/ApplicationCard";
import type { DrawerTab } from "@/pages/applications/drawer/DrawerTabs";
import { PIPELINE_STAGE_LABELS, normalizeStageId } from "@/core/engines/pipeline/pipeline.types";
import { fetchPortalApplication, openPortalApplication } from "@/api/applications";
import ApplicationOverviewTab from "@/pages/applications/drawer/tab-overview/ApplicationOverviewTab";

// BF_PORTAL_BLOCK_1_28A_SHELL_DISPATCH — wire each tab id to its real component.
import ApplicationTab from "@/pages/applications/tabs/ApplicationTab";
import BankingAnalysisTab from "@/pages/applications/tabs/BankingAnalysisTab";
import FinancialsTab from "@/pages/applications/tabs/FinancialsTab";
import DocumentsTab from "@/pages/applications/tabs/DocumentsTab";
import CreditSummaryTab from "@/pages/applications/tabs/CreditSummaryTab";
import RequestItemsTab from "@/pages/applications/tabs/RequestItemsTab"; // BF_PORTAL_BLOCK_v821_REQUEST_ITEMS_TAB
import NotesTab from "@/pages/applications/tabs/NotesTab";
import LendersTab from "@/pages/applications/tabs/LendersTab";
// BF_PORTAL_BLOCK_v123a_REMOVE_CALLS_TAB_v1 — CallHistoryTab removed
type PortalApplicationShell = {
  id: string;
  businessName: string;
  stage: string;
};

type ApplicationOverviewRecord = {
  id: string;
  stage: string;
  requested_amount: number;
  product_category: string;
  submitted_at: string;
  company_name: string;
  assigned_staff?: string;
};

const APPLICATION_TABS: DrawerTab[] = [
  // BF_NO_OVERVIEW_v38 — Block 38-C — overview tab removed (was screenshotted by accident)
  { id: "application", label: "Application" },
  { id: "banking", label: "Banking Analysis" },
  { id: "financials", label: "Financials" },
  { id: "documents", label: "Documents" },
  { id: "credit-summary", label: "Credit Summary" },
  { id: "request-items", label: "Request Items" }, // BF_PORTAL_BLOCK_v821_REQUEST_ITEMS_TAB
  { id: "notes", label: "Notes" },
  { id: "lenders", label: "Lenders" }
];

const OPENED_APPLICATIONS_KEY = "portal.applications.opened";

const readOpenedApplications = () => {
  if (typeof window === "undefined") return new Set<string>();
  const stored = window.sessionStorage.getItem(OPENED_APPLICATIONS_KEY);
  if (!stored) return new Set<string>();
  try {
    return new Set<string>(JSON.parse(stored) as string[]);
  } catch {
    return new Set<string>();
  }
};

const writeOpenedApplications = (opened: Set<string>) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(OPENED_APPLICATIONS_KEY, JSON.stringify(Array.from(opened)));
};

const parsePortalApplication = (data: unknown, id: string): PortalApplicationShell => {
  if (!data || typeof data !== "object") {
    return { id, businessName: "Unknown business", stage: "Received" };
  }
  const record = data as Record<string, unknown>;
  const businessName =
    typeof record.businessName === "string"
      ? record.businessName
      : typeof record.business_name === "string"
        ? record.business_name
        : typeof record.applicant === "string"
          ? record.applicant
          : typeof record.business === "object" && record.business && "name" in record.business
            ? String((record.business as { name?: unknown }).name ?? "Unknown business")
            : "Unknown business";
  const stageValue =
    typeof record.current_stage === "string"
      ? record.current_stage
      : typeof record.stage === "string"
        ? record.stage
        : "Received";
  return { id, businessName, stage: stageValue };
};


const parseOverviewRecord = (data: unknown, id: string): ApplicationOverviewRecord => {
  const record = (data ?? {}) as Record<string, unknown>;
  return {
    id,
    stage: String(record.stage ?? record.current_stage ?? "Received"),
    requested_amount: Number(record.requested_amount ?? record.requestedAmount ?? 0),
    product_category: String(record.product_category ?? record.productType ?? "—"),
    submitted_at: String(record.submitted_at ?? record.submittedAt ?? record.created_at ?? ""),
    company_name: String(record.company_name ?? record.business_name ?? record.businessName ?? "—"),
    assigned_staff: typeof record.assigned_staff === "string" ? record.assigned_staff : undefined
  };
};

const resolveStageLabel = (stage: string) => {
  const normalized = normalizeStageId(stage);
  return PIPELINE_STAGE_LABELS[normalized] ?? stage;
};

const ApplicationShellPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const firstTabId = APPLICATION_TABS[0]?.id ?? "overview";
  // BF_PORTAL_NOTE_DEEPLINK_v1 - honor the tab in the URL (/applications/:id/<tab>)
  // so a mention notification linking to /applications/:id/notes#note-<id> opens
  // the Notes tab instead of always defaulting to the first tab.
  const urlTabId = location.pathname.split("/").filter(Boolean)[2] ?? "";
  const validTabIds: string[] = APPLICATION_TABS.map((t) => t.id);
  const initialTabId = (validTabIds.includes(urlTabId) ? urlTabId : firstTabId) as typeof firstTabId;
  const [selectedTab, setSelectedTab] = useState(initialTabId);
  const selectTab = (tabId: typeof firstTabId) => {
    setSelectedTab(tabId);
    if (id) navigate(`/applications/${id}/${tabId}${window.location.hash}`, { replace: true });
  };

  const applicationQuery = useQuery({
    queryKey: ["portal-application", id],
    queryFn: ({ signal }) => fetchPortalApplication(id ?? "", { signal }),
    enabled: Boolean(id),
    retry: false
  });

  const openMutation = useMutation({
    mutationFn: (applicationId: string) => openPortalApplication(applicationId)
  });

  useEffect(() => {
    if (!id) return;
    const openedApplications = readOpenedApplications();
    if (openedApplications.has(id)) return;
    openedApplications.add(id);
    writeOpenedApplications(openedApplications);
    openMutation.mutate(id);
  }, [id, openMutation]);

  const application = useMemo(() => {
    if (!id) {
      return { id: "unknown", businessName: "Unknown business", stage: "Received" };
    }
    return parsePortalApplication(applicationQuery.data, id);
  }, [applicationQuery.data, id]);

  const stageLabel = resolveStageLabel(application.stage);

  return (
    <div className="application-shell">
      <Card title="Application">
        {applicationQuery.isLoading && <AppLoading />}
        {applicationQuery.error && <ErrorBanner message="Unable to load this application." />}
        <div className="application-shell__header">
          <div>
            <div className="application-shell__title">{application.businessName}</div>
            <span className="application-shell__badge">{stageLabel}</span>
          </div>
        </div>
        <ApplicationCard tabs={APPLICATION_TABS} selectedTab={selectedTab} onSelect={selectTab}>
          {selectedTab === "overview" && <ApplicationOverviewTab application={parseOverviewRecord(applicationQuery.data, application.id)} />}
          {/* BF_PORTAL_BLOCK_1_28A_SHELL_DISPATCH — real components per tab id. */}
          {selectedTab === "application" && <ApplicationTab application={applicationQuery.data as Record<string, any> | null} />}
          {selectedTab === "banking" && <BankingAnalysisTab applicationId={application.id} />}
          {selectedTab === "financials" && <FinancialsTab applicationId={application.id} />}
          {selectedTab === "documents" && <DocumentsTab applicationId={application.id} />}
          {selectedTab === "credit-summary" && <CreditSummaryTab applicationId={application.id} />}
          {selectedTab === "request-items" && <RequestItemsTab applicationId={application.id} />}
          {selectedTab === "notes" && <NotesTab applicationId={application.id} />}
          {selectedTab === "lenders" && <LendersTab applicationId={application.id} />}
        </ApplicationCard>
      </Card>
    </div>
  );
};

export default ApplicationShellPage;
