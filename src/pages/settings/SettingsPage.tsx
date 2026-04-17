import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import IssueReports from "@/features/support/IssueReports";
import SupportQueue from "@/features/support/SupportQueue";
import KnowledgeManager from "@/features/ai/KnowledgeManager";
import WebLeads from "@/features/crm/WebLeads";
import LiveActivity from "@/features/analytics/LiveActivity";
import SettingsSectionLayout from "./components/SettingsSectionLayout";
import BrandingSettings from "./tabs/BrandingSettings";
import ProfileSettings from "./tabs/ProfileSettings";
import RuntimeSettings from "./tabs/RuntimeSettings";
import UserManagement from "./tabs/UserManagement";
import SettingsOverview from "./tabs/SettingsOverview";

const SettingsPage = () => {
  const [searchParams] = useSearchParams();
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const canViewSupport = user?.role === "Admin" || user?.role === "Staff";

  const tabs = useMemo(
    () => [
      { id: "users", label: "User Management", visible: isAdmin, content: <UserManagement /> },
      { id: "support", label: "Support Queue", visible: canViewSupport, content: <SupportQueue /> },
      { id: "issues", label: "Issue Reports", visible: canViewSupport, content: <IssueReports /> },
      { id: "ai-knowledge", label: "AI Knowledge", visible: isAdmin, content: isAdmin ? <KnowledgeManager /> : null },
      { id: "web-leads", label: "Website Leads", visible: canViewSupport, content: <WebLeads /> },
      { id: "live-activity", label: "Live Activity", visible: canViewSupport, content: <LiveActivity /> },
      { id: "profile", label: "My Profile", visible: true, content: <ProfileSettings /> },
      { id: "branding", label: "Branding", visible: true, content: <BrandingSettings /> },
      { id: "runtime", label: "Runtime Verification", visible: true, content: <RuntimeSettings /> }
    ],
    [canViewSupport, isAdmin]
  );

  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const availableTabs = safeTabs.filter((tab) => tab.visible);
  const activeTabId = tabParam ?? searchParams.get("tab");
  const fallbackTabId = availableTabs[0]?.id ?? "profile";
  const resolvedTabId = availableTabs.some((tab) => tab.id === activeTabId) ? activeTabId : fallbackTabId;
  const activeTab = availableTabs.find((tab) => tab.id === resolvedTabId) ?? availableTabs[0];
  const showOverview = !tabParam && !searchParams.get("tab");

  useEffect(() => {
    if (!tabParam && activeTabId) {
      navigate(`/settings/${resolvedTabId}`, { replace: true });
      return;
    }
    if (tabParam && resolvedTabId !== tabParam) {
      navigate(`/settings/${resolvedTabId}`, { replace: true });
    }
  }, [activeTabId, navigate, resolvedTabId, tabParam]);

  return (
    <RequireRole roles={["Admin", "Staff"]}>
      <ErrorBoundary>
        <SettingsSectionLayout>
          {showOverview ? (
            <SettingsOverview />
          ) : availableTabs.length === 0 ? (
            <div className="settings-panel" role="status">
              <h2>Settings</h2>
              <p>No settings sections are available for your account.</p>
            </div>
          ) : (
            <div className="settings-layout">
              <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === resolvedTabId}
                    className={`settings-tab ${tab.id === resolvedTabId ? "is-active" : ""}`}
                    onClick={() => navigate(`/settings/${tab.id}`)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="settings-content" role="tabpanel">
                <ErrorBoundary>{activeTab?.content}</ErrorBoundary>
              </div>
            </div>
          )}
        </SettingsSectionLayout>
      </ErrorBoundary>
    </RequireRole>
  );
};

export default SettingsPage;
