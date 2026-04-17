import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import IssueReports from "@/features/support/IssueReports";
import SupportQueue from "@/features/support/SupportQueue";
import SettingsSectionLayout from "./components/SettingsSectionLayout";
import BrandingSettings from "./tabs/BrandingSettings";
import ProfileSettings from "./tabs/ProfileSettings";
import RuntimeSettings from "./tabs/RuntimeSettings";
import UserManagement from "./tabs/UserManagement";

const SettingsPage = () => {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const canViewSupport = user?.role === "Admin" || user?.role === "Staff";

  const tabs = useMemo(
    () => [
      { id: "profile", label: "Profile", visible: true, content: <ProfileSettings /> },
      { id: "users", label: "User Management", visible: isAdmin, content: <UserManagement /> },
      { id: "branding", label: "Branding", visible: true, content: <BrandingSettings /> },
      { id: "runtime", label: "Runtime", visible: true, content: <RuntimeSettings /> },
      {
        id: "support-issues",
        label: "Support / Issues",
        visible: canViewSupport,
        content: (
          <div className="settings-stack">
            <SupportQueue />
            <IssueReports />
          </div>
        )
      }
    ],
    [isAdmin, canViewSupport]
  );

  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const availableTabs = safeTabs.filter((tab) => tab.visible);
  const activeTabId = tabParam;
  const fallbackTabId = availableTabs[0]?.id ?? "profile";
  const resolvedTabId = availableTabs.some((tab) => tab.id === activeTabId) ? activeTabId : fallbackTabId;
  const activeTab = availableTabs.find((tab) => tab.id === resolvedTabId) ?? availableTabs[0];

  useEffect(() => {
    if (!tabParam || resolvedTabId !== tabParam) {
      navigate(`/settings/${resolvedTabId}`, { replace: true });
    }
  }, [navigate, resolvedTabId, tabParam]);

  return (
    <RequireRole roles={["Admin", "Staff"]}>
      <ErrorBoundary>
        <SettingsSectionLayout>
          {availableTabs.length === 0 ? (
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
