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
import CallHistoryTab from "./tab-call-history/CallHistoryTab";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { usePipelineStore } from "@/core/engines/pipeline/pipeline.store";

const tabContentMap: Partial<Record<DrawerTabId, JSX.Element>> = {
  application: <ApplicationTab />,
  banking: <BankingTab />,
  financials: <FinancialTab />,
  "credit-summary": <CreditSummaryTab />,
  documents: <DocumentsTab />,
  "call-history": <CallHistoryTab />,
  notes: <NotesTab />,
  lenders: <LendersTab />
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
          <div className="application-drawer__content">{activeTab ? tabContentMap[activeTab] ?? null : null}</div>
        </ApplicationCard>
      </div>
    </div>
  );
};




export default ApplicationDrawer;
