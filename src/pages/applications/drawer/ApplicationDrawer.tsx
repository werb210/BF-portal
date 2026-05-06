import { useEffect, useRef } from "react";
import DrawerHeader from "./DrawerHeader";
import { TABS, type DrawerTabId } from "./DrawerTabs";
import ApplicationCard from "@/pages/applications/ApplicationCard";
import ApplicationTab from "./tab-application/ApplicationTab";
import FinancialTab from "./tab-financial/FinancialTab";
import BankingTab from "./tab-banking/BankingTab";
import CreditSummaryTab from "./tab-credit-summary/CreditSummaryTab";
import DocumentsTab from "./tab-documents/DocumentsTab";
import NotesTab from "./tab-notes/NotesTab";
import LendersTab from "./tab-lenders/LendersTab";
// BF_PORTAL_BLOCK_v123a_REMOVE_CALLS_TAB_v1 — CallHistoryTab removed
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { usePipelineStore } from "@/core/engines/pipeline/pipeline.store";
// BF_PORTAL_BLOCK_v171_DRAWER_TABS_PROP_AND_BOUNDARY_v1
import TabErrorBoundary from "./TabErrorBoundary";

// BF_PORTAL_BLOCK_v171_DRAWER_TABS_PROP_AND_BOUNDARY_v1
// All tabs now receive applicationId synchronously via prop. Previously
// 5 of 7 tabs (application, banking, credit-summary, documents, notes)
// dropped the parameter and read from useApplicationDrawerStore — a
// store that only got populated by a useEffect AFTER the first render
// of <ApplicationDrawer>. The first render saw selectedApplicationId=null,
// the useQuery/useEffect bailed, and on some renders the subsequent
// store update did not retrigger a re-fetch. Symptom: "tab opens but
// is empty" for the staff user. Each tab is also wrapped in
// TabErrorBoundary so render crashes show the actual error inline
// instead of going blank.
const tabContentMap: Partial<Record<DrawerTabId, (applicationId: string) => JSX.Element>> = {
  application: (applicationId) => (
    <TabErrorBoundary tabId="application">
      <ApplicationTab applicationId={applicationId} />
    </TabErrorBoundary>
  ),
  banking: (applicationId) => (
    <TabErrorBoundary tabId="banking">
      <BankingTab applicationId={applicationId} />
    </TabErrorBoundary>
  ),
  financials: (applicationId) => (
    <TabErrorBoundary tabId="financials">
      <FinancialTab applicationId={applicationId} />
    </TabErrorBoundary>
  ),
  "credit-summary": (applicationId) => (
    <TabErrorBoundary tabId="credit-summary">
      <CreditSummaryTab applicationId={applicationId} />
    </TabErrorBoundary>
  ),
  documents: (applicationId) => (
    <TabErrorBoundary tabId="documents">
      <DocumentsTab applicationId={applicationId} />
    </TabErrorBoundary>
  ),
  notes: (applicationId) => (
    <TabErrorBoundary tabId="notes">
      <NotesTab applicationId={applicationId} />
    </TabErrorBoundary>
  ),
  lenders: (applicationId) => (
    <TabErrorBoundary tabId="lenders">
      <LendersTab applicationId={applicationId} />
    </TabErrorBoundary>
  ),
};

const ApplicationDrawer = () => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const { selectedTab, setTab } = useApplicationDrawerStore();
  const isOpen = usePipelineStore((state) => state.isDrawerOpen);
  const selectedApplicationId = usePipelineStore((state) => state.selectedApplicationId);
  const closeDrawer = usePipelineStore((state) => state.closeDrawer);
  const visibleTabs = TABS;
  const tabOrder = visibleTabs.map((tab) => tab.id);
  const defaultTab = tabOrder[0] ?? null;
  const activeTab = tabOrder.includes(selectedTab) ? selectedTab : defaultTab;
  const selectedIndex = activeTab ? tabOrder.indexOf(activeTab) : -1;
  const previousTab = selectedIndex > 0 ? tabOrder[selectedIndex - 1] : null;

  useEffect(() => {
    useApplicationDrawerStore.setState({
      isOpen,
      selectedApplicationId
    });
  }, [isOpen, selectedApplicationId]);

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.id === selectedTab)) {
      const firstVisibleTab = visibleTabs[0];
      if (!firstVisibleTab) return;
      setTab(firstVisibleTab.id);
    }
  }, [selectedTab, setTab, visibleTabs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        closeDrawer();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeDrawer]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleTabChange = (tab: DrawerTabId) => setTab(tab);

  if (!isOpen || !selectedApplicationId) return null;

  return (
    <div className="application-drawer-overlay" ref={overlayRef}>
      <div className="application-drawer" ref={drawerRef}>
        <DrawerHeader
          applicationId={selectedApplicationId}
          onBack={previousTab ? () => setTab(previousTab) : undefined}
          canGoBack={Boolean(previousTab)}
          onClose={closeDrawer}
        />
        <ApplicationCard tabs={visibleTabs} selectedTab={activeTab ?? selectedTab} onSelect={handleTabChange}>
          <div className="application-drawer__content">{activeTab ? tabContentMap[activeTab]?.(selectedApplicationId) ?? null : null}</div>
        </ApplicationCard>
      </div>
    </div>
  );
};




export default ApplicationDrawer;
