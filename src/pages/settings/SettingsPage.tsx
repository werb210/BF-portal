// BF_PORTAL_BI_SILO_NAV_v56 — BI silo Settings deliberately scopes to
// "My Profile" only. User Management, AI Knowledge, and Runtime
// Verification all live in BF; BI inherits the user table from BF and
// has no per-silo admin surface, so showing those tabs in BI just
// confuses staff. BF and SLF Settings are unchanged.
// BF_PORTAL_v869_SETTINGS_PACK - phone menu, booking pages, lead rotation, blocked numbers, never log, security,
// privacy requests and the client survey.
import PhoneMenuSettings from "@/settingsPack/PhoneMenuSettings";
import BookingSettings from "@/settingsPack/BookingSettings";
import PrivacySettings from "@/settingsPack/PrivacySettings";
import SecuritySettings from "@/settingsPack/SecuritySettings";
import SurveySettings from "@/settingsPack/SurveySettings";
import { BlockedNumbersSettings, LeadRotationSettings, NeverLogSettings } from "@/settingsPack/ListSettings";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useSilo } from "@/hooks/useSilo";
import KnowledgeManager from "@/features/ai/KnowledgeManager";
import MayaTuning from "@/features/ai/MayaTuning";
import SettingsSectionLayout from "./components/SettingsSectionLayout";
import ProfileSettings from "./tabs/ProfileSettings";
import RuntimeSettings from "./tabs/RuntimeSettings";
import UsersAndRoles from "@/roles/UsersAndRoles"; // BF_PORTAL_v870_CRM_DATA_MODEL - people and roles
import { can, usePermissions } from "@/roles/permissionStore"; // BF_PORTAL_v870_CRM_DATA_MODEL
import PropertiesSettings from "@/crmFields/PropertiesSettings"; // BF_PORTAL_v870_CRM_DATA_MODEL
import TeamsSettings from "@/teams/TeamsSettings"; // BF_PORTAL_v870_CRM_DATA_MODEL
import PipelinesSettings from "@/pipelines/PipelinesSettings"; // BF_PORTAL_v870_CRM_DATA_MODEL
import PhoneLines from "./tabs/PhoneLines"; // BF_PORTAL_PHONE_LINES_v689
import SettingsOverview from "./tabs/SettingsOverview";
import ContentSettings, { isContentSection } from "./tabs/ContentSettings"; // BF_PORTAL_v864_CONTENT_TAB
import RetentionSettings from "./tabs/RetentionSettings"; // BF_PORTAL_v855_RETENTION
import FraudProtectionCard from "@/fraud/FraudProtectionCard"; // BF_PORTAL_v846_FRAUD
import QuickBooksCard from "@/features/quickbooks/QuickBooksCard"; // BF_PORTAL_v852_CALC_QBO
import DealToolsSettings from "@/brokerTools/DealToolsSettings"; // BF_PORTAL_v865_BROKER_TOOLS

const SettingsPage = () => {
  const [searchParams] = useSearchParams();
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { silo } = useSilo();
  // BF_PORTAL_v870_CRM_DATA_MODEL - an Admin on a custom role (built from Admin) sees only the admin sections the role
  // allows. Everyone on a built-in role sees exactly the tabs they saw before.
  const perms = usePermissions();
  const isAdminRole = user?.role === "Admin";
  const isAdmin = isAdminRole && can("settings", "view", perms);
  const canUsers = isAdminRole && can("users", "view", perms);
  const isStaff = user?.role === "Staff"; // BF_PORTAL_BLOCK_v526
  const isBI = String(silo ?? "").toUpperCase() === "BI";
  const isMarketing = user?.role === "Marketing"; // BF_PORTAL_v864_CONTENT_TAB

  const tabs = useMemo(
    () => [
      { id: "users", label: "Users & roles", visible: canUsers && !isBI, content: <UsersAndRoles /> }, // BF_PORTAL_v870_CRM_DATA_MODEL
      // BF_PORTAL_v870_CRM_DATA_MODEL - custom fields (Properties), teams and record visibility, extra pipelines. Admins.
      { id: "properties", label: "Properties", visible: isAdmin && !isBI, content: <PropertiesSettings /> },
      { id: "teams", label: "Teams", visible: canUsers && !isBI, content: <TeamsSettings /> },
      { id: "pipelines", label: "Pipelines", visible: isAdmin && !isBI, content: <PipelinesSettings /> },
      { id: "phone", label: "Phone lines", visible: isAdmin && !isBI, content: <PhoneLines /> }, // BF_PORTAL_PHONE_LINES_v689
      { id: "ai-knowledge", label: "AI Knowledge", visible: isAdmin && !isBI, content: isAdmin ? (<><KnowledgeManager /><div style={{ height: 28 }} /><MayaTuning /></>) : null },
      // BF_PORTAL_v846_FRAUD - Admins: Keystone watchlist opt-in, pre-screen default, services, staff alerts.
      { id: "fraud", label: "Fraud protection", visible: isAdmin && !isBI, content: isAdmin ? <FraudProtectionCard /> : null },
      // BF_PORTAL_v852_CALC_QBO - connect QuickBooks Online; media fee agreements become invoices, paid at funding.
      { id: "quickbooks", label: "QuickBooks", visible: isAdmin && !isBI, content: isAdmin ? <QuickBooksCard /> : null },
      { id: "profile", label: "My Profile", visible: true, content: <ProfileSettings /> },
      { id: "runtime", label: "Runtime Verification", visible: !isBI, content: <RuntimeSettings /> },
      // BF_PORTAL_v864_CONTENT_TAB - Templates, Snippets, Collateral, the Library and the automations are sections of
      // one Content tab (see tabs/ContentSettings.tsx). Snippets and the Library still show in BI.
      { id: "content", label: "Content", visible: true, content: <ContentSettings isBI={isBI} canAutomate={isAdmin || isMarketing} /> },
      { id: "deal-tools", label: "Deal tools", visible: (isAdmin || isStaff) && !isBI, content: <DealToolsSettings isAdmin={isAdmin} /> }, // BF_PORTAL_v865_BROKER_TOOLS
      // BF_PORTAL_v855_RETENTION - 7-year record retention: legal holds and the eligible-for-deletion report.
      { id: "retention", label: "Retention & legal holds", visible: isAdmin, content: isAdmin ? <RetentionSettings /> : null },
      // BF_PORTAL_v869_SETTINGS_PACK - ported from KS-Portal #35. The phone menu is the one 866 menu (every silo); lead
      // rotation and privacy requests follow the topbar silo; booking pages and the client survey are BF.
      { id: "phone-menu", label: "Phone menu", visible: isAdmin, content: isAdmin ? <PhoneMenuSettings /> : null },
      { id: "booking", label: "Booking pages", visible: isAdmin && !isBI, content: isAdmin ? <BookingSettings /> : null },
      { id: "lead-rotation", label: "Lead rotation", visible: isAdmin, content: isAdmin ? <LeadRotationSettings /> : null },
      { id: "blocked-numbers", label: "Blocked numbers", visible: isAdmin, content: isAdmin ? <BlockedNumbersSettings /> : null },
      { id: "never-log", label: "Never log", visible: isAdmin, content: isAdmin ? <NeverLogSettings /> : null },
      { id: "security", label: "Security", visible: isAdmin, content: isAdmin ? <SecuritySettings /> : null },
      { id: "privacy", label: "Privacy requests", visible: isAdmin, content: isAdmin ? <PrivacySettings /> : null },
      { id: "survey", label: "Client survey", visible: isAdmin && !isBI, content: isAdmin ? <SurveySettings /> : null },
      // BF_PORTAL_PARTNERS_TABS_v720 - Broker Files moved to Marketing > Referrers > Brokers.
    ],
    [isAdmin, isStaff, isBI, isMarketing, canUsers]
  );

  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const availableTabs = safeTabs.filter((tab) => tab.visible);
  const requestedTabId = tabParam ?? searchParams.get("tab");
  // BF_PORTAL_v864_CONTENT_TAB - the old tabs (/settings/templates, /settings/snippets, /settings/collateral,
  // /settings/library) forward to their section of Content, so links and bookmarks keep working.
  const legacySection = isContentSection(requestedTabId) ? requestedTabId : null;
  const activeTabId = legacySection ? "content" : requestedTabId;
  const fallbackTabId = availableTabs.some((tab) => tab.id === "profile") ? "profile" : availableTabs[0]?.id ?? "profile";
  const resolvedTabId = availableTabs.some((tab) => tab.id === activeTabId) ? activeTabId : fallbackTabId;
  const activeTab = availableTabs.find((tab) => tab.id === resolvedTabId) ?? availableTabs[0];
  // v694: land directly on the tabbed view (default My Profile) instead of the card chooser.
  const showOverview = false;

  useEffect(() => {
    if (legacySection) {
      navigate(`/settings/content?section=${legacySection}`, { replace: true });
      return;
    }
    if (!tabParam) {
      navigate(`/settings/${resolvedTabId}`, { replace: true });
      return;
    }
    if (tabParam && resolvedTabId !== tabParam) {
      navigate(`/settings/${resolvedTabId}`, { replace: true });
    }
  }, [activeTabId, navigate, resolvedTabId, tabParam, legacySection]);

  return (
    <RequireRole roles={["Admin", "Staff", "Marketing"]}>
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
              <div className="settings-tabs" role="tablist" aria-label="Settings tabs" style={{ display: "flex", flexDirection: "row", gap: 4, borderBottom: "1px solid var(--ui-border)", marginBottom: 24, flexWrap: "wrap" }}>
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

// BF_PORTAL_BI_SILO_NAV_v56_SETTINGS_ANCHOR
