import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import KnowledgeManager from "@/features/ai/KnowledgeManager";
import SettingsSectionLayout from "./components/SettingsSectionLayout";
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

  const tabs = useMemo(
    () => [
      { id: "users", label: "User Management", visible: isAdmin, content: <UserManagement /> },
      { id: "ai-knowledge", label: "AI Knowledge", visible: isAdmin, content: isAdmin ? <KnowledgeManager /> : null },
      { id: "profile", label: "My Profile", visible: true, content: <ProfileSettings /> },
      { id: "runtime", label: "Runtime Verification", visible: true, content: <RuntimeSettings /> },
    ],
    [isAdmin]
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
              <div className="settings-tabs" role="tablist" aria-label="Settings tabs" style={{ display: "flex", flexDirection: "row", gap: 4, borderBottom: "1px solid #e2e8f0", marginBottom: 24, flexWrap: "wrap" }}>
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === resolvedTabId}
                    className={`settings-tab ${tab.id === resolvedTabId ? "is-active" : ""}`}
                    style={{ padding: "8px 16px", borderRadius: "6px 6px 0 0", whiteSpace: "nowrap" }}
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
