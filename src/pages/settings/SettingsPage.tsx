// BF_PORTAL_BI_SILO_NAV_v56 — BI silo Settings deliberately scopes to
// "My Profile" only. User Management, AI Knowledge, and Runtime
// Verification all live in BF; BI inherits the user table from BF and
// has no per-silo admin surface, so showing those tabs in BI just
// confuses staff. BF and SLF Settings are unchanged.
// BF_PORTAL_v869_SETTINGS_PACK - phone menu, booking pages, lead rotation, blocked numbers, never log, security,
// privacy requests and the client survey.
import PhoneMenuSettings from "@/settingsPack/PhoneMenuSettings";
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
import BrokerPaySettings from "@/pages/settings/BrokerPaySettings"; // BF_PORTAL_v942_BROKER_PAY
import UsersAndRoles from "@/roles/UsersAndRoles"; // BF_PORTAL_v870_CRM_DATA_MODEL - people and roles
import { can, usePermissions } from "@/roles/permissionStore"; // BF_PORTAL_v870_CRM_DATA_MODEL
import PropertiesSettings from "@/crmFields/PropertiesSettings"; // BF_PORTAL_v870_CRM_DATA_MODEL
import TeamsSettings from "@/teams/TeamsSettings"; // BF_PORTAL_v870_CRM_DATA_MODEL
import PipelinesSettings from "@/pipelines/PipelinesSettings"; // BF_PORTAL_v870_CRM_DATA_MODEL
import PhoneLines from "./tabs/PhoneLines"; // BF_PORTAL_PHONE_LINES_v689
import ContentSettings, { isContentSection } from "./tabs/ContentSettings"; // BF_PORTAL_v864_CONTENT_TAB
import RetentionSettings from "./tabs/RetentionSettings"; // BF_PORTAL_v855_RETENTION
import FraudProtectionCard from "@/fraud/FraudProtectionCard"; // BF_PORTAL_v846_FRAUD
import QuickBooksCard from "@/features/quickbooks/QuickBooksCard"; // BF_PORTAL_v852_CALC_QBO
import DealToolsSettings from "@/brokerTools/DealToolsSettings"; // BF_PORTAL_v865_BROKER_TOOLS
import YourDocumentsSettings from "@/licenseeDocs/YourDocumentsSettings"; // BF_PORTAL_v938_OUR_TERM_SHEET
import CallScriptsSettings from "@/callScripts/CallScriptsSettings"; // BF_PORTAL_v871_CALL_SCRIPTS
import CallQueuesSettings from "@/callQueues/CallQueuesSettings"; // BF_PORTAL_v871_CALL_QUEUES
import PaymentsSettings from "@/payments/PaymentsSettings"; // BF_PORTAL_v872_PAYMENTS
import IdVerificationSettings from "@/kyc/IdVerificationSettings"; // BF_PORTAL_v872_KYC
import VendorKeysSettings from "@/integrations/VendorKeysSettings"; // BF_PORTAL_v898_YOUR_SERVICES
// BF_PORTAL_v875_INTEGRATIONS - outgoing webhooks and API keys (per silo), Microsoft sign-in (all of Boreal).
import WebhooksSettings from "@/integrations/WebhooksSettings";
import ApiKeysSettings from "@/integrations/ApiKeysSettings";
import MicrosoftSignInSettings from "@/integrations/MicrosoftSignInSettings";
// BF_PORTAL_v947_BROKERAGE_SETUP - brokerage-wide set-up that used to sit in Marketing and My Profile.
import WebsiteKitPanel from "@/components/marketing/WebsiteKitPanel";
import LeadScoringPanel from "@/components/marketing/LeadScoringPanel";
import SocialPanel from "@/social/SocialPanel";
import SharedMailboxSignatures from "./tabs/SharedMailboxSignatures";

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
  // BF_PORTAL_v885_SETTINGS_ROLES - Admins see every setting (brokerage set-up). Staff and Marketing see the YOU items:
  // My Profile, Content and AI Knowledge (v892; Marketing's extra is the Marketing tab in the sidebar).
  const isTeamMember = (isStaff || isMarketing) && !isBI;

  const tabs = useMemo(
    () => [
      { id: "users", label: "Users & roles", visible: canUsers && !isBI, content: <UsersAndRoles /> }, // BF_PORTAL_v870_CRM_DATA_MODEL
      // BF_PORTAL_v870_CRM_DATA_MODEL - custom fields (Properties), teams and record visibility, extra pipelines. Admins.
      { id: "properties", label: "Properties", visible: isAdmin && !isBI, content: <PropertiesSettings /> },
      { id: "teams", label: "Teams", visible: canUsers && !isBI, content: <TeamsSettings /> },
      { id: "pipelines", label: "Pipelines", visible: isAdmin && !isBI, content: <PipelinesSettings /> },
      // BF_PORTAL_v947_BROKERAGE_SETUP
      { id: "lead-scoring", label: "Lead scoring", visible: isAdmin, content: isAdmin ? <LeadScoringPanel /> : null },
      { id: "website-kit", label: "Website kit", visible: isAdmin, content: isAdmin ? (<><p data-testid="website-kit-explainer" style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ui-text)" }}>Add forms and chat to other websites so their leads land in this CRM.</p><WebsiteKitPanel /></>) : null },
      { id: "shared-signatures", label: "Shared mailbox signatures", visible: isAdmin, content: isAdmin ? <SharedMailboxSignatures /> : null },
      { id: "social-accounts", label: "Social accounts", visible: isAdmin && !isBI, content: isAdmin ? <SocialPanel mode="accounts" /> : null },
      { id: "phone", label: "Phone lines", visible: isAdmin && !isBI, content: <PhoneLines /> }, // BF_PORTAL_PHONE_LINES_v689
      { id: "ai-knowledge", label: "AI Knowledge", visible: (isAdmin || isTeamMember) && !isBI, content: isAdmin ? (<><KnowledgeManager /><div style={{ height: 28 }} /><MayaTuning /></>) : <KnowledgeManager /> },
      // BF_PORTAL_v846_FRAUD - Admins: Keystone watchlist opt-in, pre-screen default, services, staff alerts.
      { id: "fraud", label: "Fraud protection", visible: isAdmin && !isBI, content: isAdmin ? <FraudProtectionCard /> : null },
      // BF_PORTAL_v852_CALC_QBO - connect QuickBooks Online; media fee agreements become invoices, paid at funding.
      { id: "quickbooks", label: "QuickBooks", visible: isAdmin && !isBI, content: isAdmin ? <QuickBooksCard /> : null },
      // BF_PORTAL_v872_DEAL_TOOLS - Stripe payment links for broker fees (Boreal's own account) and ID verification (Admins).
      { id: "payments", label: "Payments", visible: isAdmin && !isBI, content: isAdmin ? <PaymentsSettings /> : null },
      { id: "id-verification", label: "ID verification", visible: isAdmin && !isBI, content: isAdmin ? <IdVerificationSettings /> : null },
      { id: "your-services", label: "Your services", visible: isAdmin && !isBI, content: isAdmin ? <VendorKeysSettings /> : null }, // BF_PORTAL_v898_YOUR_SERVICES
      { id: "profile", label: "My Profile", visible: true, content: <ProfileSettings /> },
      { id: "runtime", label: "Runtime Verification", visible: isAdmin && !isBI, content: <RuntimeSettings /> },
      // BF_PORTAL_v864_CONTENT_TAB - Templates, Snippets, Collateral, the Library and the automations are sections of
      // one Content tab (see tabs/ContentSettings.tsx). Snippets and the Library still show in BI.
      // BF_PORTAL_v892_SETTINGS_YOU - Content is under YOU for every Broker (Staff), Marketing and Admin user. Each screen
      // keeps its own limits (collateral uploads and deletes stay Admin; automations are Admin and Marketing).
      { id: "content", label: "Content", visible: isAdmin || isStaff || isMarketing, content: <ContentSettings isBI={isBI} canAutomate={isAdmin || isMarketing} /> },
      { id: "deal-tools", label: "Deal tools", visible: isAdmin && !isBI, content: <DealToolsSettings isAdmin={isAdmin} /> }, // BF_PORTAL_v865_BROKER_TOOLS
      { id: "broker-pay", label: "Broker pay", visible: isAdmin && !isBI, content: isAdmin ? <BrokerPaySettings /> : null }, // BF_PORTAL_v942_BROKER_PAY
      { id: "your-documents", label: "Term sheet templates", visible: (isAdmin || isStaff) && !isBI, content: <YourDocumentsSettings isAdmin={isAdmin} /> }, // BF_PORTAL_v938_OUR_TERM_SHEET
      // BF_PORTAL_v855_RETENTION - 7-year record retention: legal holds and the eligible-for-deletion report.
      { id: "retention", label: "Retention & legal holds", visible: isAdmin, content: isAdmin ? <RetentionSettings /> : null },
      // BF_PORTAL_v869_SETTINGS_PACK - ported from KS-Portal #35. The phone menu is the one 866 menu (every silo); lead
      // rotation and privacy requests follow the topbar silo; booking pages and the client survey are BF.
      { id: "phone-menu", label: "Phone menu", visible: isAdmin, content: isAdmin ? <PhoneMenuSettings /> : null },
      // BF_PORTAL_v871_CALLING_TOOLS - call scripts follow the topbar silo; call queues are on the one 866 line (every
      // silo): Admins set them up and watch the live panel, staff switch their own queue availability.
      { id: "call-scripts", label: "Call scripts", visible: isAdmin, content: isAdmin ? <CallScriptsSettings /> : null },
      { id: "call-queues", label: "Call queues", visible: isAdmin, content: <CallQueuesSettings /> },
      // BF_PORTAL_v885_SETTINGS_ROLES - Booking pages removed: the Booking URL on My Profile is the one booking link.
      { id: "lead-rotation", label: "Lead rotation", visible: isAdmin, content: isAdmin ? <LeadRotationSettings /> : null },
      { id: "blocked-numbers", label: "Blocked numbers", visible: isAdmin, content: isAdmin ? <BlockedNumbersSettings /> : null },
      { id: "never-log", label: "Never log", visible: isAdmin, content: isAdmin ? <NeverLogSettings /> : null },
      { id: "security", label: "Security", visible: isAdmin, content: isAdmin ? <SecuritySettings /> : null },
      // BF_PORTAL_v875_INTEGRATIONS - Admins. Webhooks and API keys follow the topbar silo; Microsoft sign-in is one
      // switch for every silo.
      { id: "microsoft-sign-in", label: "Microsoft sign-in", visible: isAdmin, content: isAdmin ? <MicrosoftSignInSettings /> : null },
      { id: "webhooks", label: "Webhooks", visible: isAdmin, content: isAdmin ? <WebhooksSettings /> : null },
      { id: "api-keys", label: "API keys", visible: isAdmin, content: isAdmin ? <ApiKeysSettings /> : null },
      { id: "privacy", label: "Privacy requests", visible: isAdmin, content: isAdmin ? <PrivacySettings /> : null },
      { id: "survey", label: "Client survey", visible: isAdmin && !isBI, content: isAdmin ? <SurveySettings /> : null },
      // BF_PORTAL_PARTNERS_TABS_v720 - Broker Files moved to Marketing > Referrers > Brokers.
    ],
    [isAdmin, isTeamMember, isBI, isMarketing, isStaff, canUsers]
  );

  // BF_PORTAL_v885_SETTINGS_ROLES - the ~30 tabs are grouped (Option A of the settings redesign): a list on the left,
  // and each group opens as one page with its sections stacked. Old addresses (/settings/phone-menu, /settings/fraud ...)
  // still work: they open their group and scroll to that section.
  const visibleSections = tabs.filter((tab) => tab.visible);
  // BF_PORTAL_v892_SETTINGS_YOU - everyone gets the YOU groups (My Profile, Content, AI Knowledge); Admins also get
  // the brokerage set-up groups.
  const groups = SETTINGS_GROUPS.filter((g) => isAdmin || g.heading === "YOU").map((g) => ({ ...g, sections: g.sectionIds.map((id) => visibleSections.find((t) => t.id === id)).filter((t): t is (typeof visibleSections)[number] => Boolean(t)) }))
    .filter((g) => g.sections.length > 0);
  const requestedTabId = tabParam ?? searchParams.get("tab");
  // BF_PORTAL_v864_CONTENT_TAB - the old tabs (/settings/templates, /settings/snippets, /settings/collateral,
  // /settings/library) forward to their section of Content, so links and bookmarks keep working.
  const legacySection = isContentSection(requestedTabId) ? requestedTabId : null;
  // BF_PORTAL_v892_SETTINGS_YOU - the old "Content and AI" address opens Content.
  const activeId = legacySection ? "content" : requestedTabId === "content-ai" ? "content" : requestedTabId;
  const groupOf = (id: string | null | undefined) => groups.find((g) => g.id === id) ?? groups.find((g) => g.sections.some((t) => t.id === id));
  const fallbackGroup = groups.find((g) => g.id === "profile") ?? groups[0];
  const activeGroup = groupOf(activeId) ?? fallbackGroup;
  const resolvedTabId = activeGroup && (activeGroup.id === activeId || activeGroup.sections.some((t) => t.id === activeId)) ? String(activeId) : activeGroup?.id ?? "profile";
  const focusSection = activeGroup && activeGroup.id !== resolvedTabId ? resolvedTabId : null;

  useEffect(() => {
    if (legacySection) {
      navigate(`/settings/content?section=${legacySection}`, { replace: true });
      return;
    }
    if (tabParam !== resolvedTabId) navigate(`/settings/${resolvedTabId}`, { replace: true });
  }, [navigate, resolvedTabId, tabParam, legacySection]);

  useEffect(() => {
    if (!focusSection) return;
    const el = typeof document !== "undefined" ? document.getElementById(`settings-section-${focusSection}`) : null;
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
  }, [focusSection]);

  let lastHeading = "";
  return (
    <RequireRole roles={["Admin", "Staff", "Marketing"]}>
      <ErrorBoundary>
        <SettingsSectionLayout>
          {groups.length === 0 ? (
            <div className="settings-panel" role="status">
              <h2>Settings</h2>
              <p>No settings sections are available for your account.</p>
            </div>
          ) : (
            <div className="settings-grouped">
              <style>{GROUPED_CSS}</style>
              <div className="settings-groups" role="tablist" aria-label="Settings tabs" aria-orientation="vertical">
                {groups.map((g) => {
                  const heading = g.heading !== lastHeading && isAdmin ? g.heading : "";
                  lastHeading = g.heading;
                  return (
                    <div key={g.id} style={{ display: "contents" }}>
                      {heading && <div className="settings-group-heading">{heading}</div>}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={g.id === activeGroup?.id}
                        className={`settings-group ${g.id === activeGroup?.id ? "is-active" : ""}`}
                        onClick={() => navigate(`/settings/${g.id}`)}
                      >
                        {g.label}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="settings-content" role="tabpanel" aria-label={activeGroup?.label}>
                {activeGroup && activeGroup.sections.length > 1 && <h2 className="settings-group-title">{activeGroup.label}</h2>}
                {activeGroup?.sections.map((t) => (
                  <section key={t.id} id={`settings-section-${t.id}`} className="settings-group-section" aria-label={t.label}>
                    {activeGroup.sections.length > 1 && <h3 className="settings-section-title">{t.label}</h3>}
                    <ErrorBoundary>{t.content}</ErrorBoundary>
                  </section>
                ))}
              </div>
            </div>
          )}
        </SettingsSectionLayout>
      </ErrorBoundary>
    </RequireRole>
  );
};

// BF_PORTAL_v885_SETTINGS_ROLES - the groups and which sections each holds, in order.
export const SETTINGS_GROUPS: Array<{ id: string; label: string; heading: string; sectionIds: string[] }> = [
  { id: "profile", label: "My Profile", heading: "YOU", sectionIds: ["profile"] },
  // BF_PORTAL_v892_SETTINGS_YOU - Content and AI Knowledge are their own items under YOU (were "Content and AI").
  { id: "content", label: "Content", heading: "YOU", sectionIds: ["content"] },
  { id: "ai-knowledge", label: "AI Knowledge", heading: "YOU", sectionIds: ["ai-knowledge"] },
  { id: "team", label: "Team and roles", heading: "BROKERAGE SET-UP", sectionIds: ["users", "teams"] },
  { id: "crm", label: "CRM set-up", heading: "BROKERAGE SET-UP", sectionIds: ["properties", "pipelines", "lead-scoring"] },
  { id: "phone", label: "Phone", heading: "BROKERAGE SET-UP", sectionIds: ["phone", "phone-menu", "call-queues", "call-scripts", "lead-rotation", "blocked-numbers", "never-log"] },
  { id: "email", label: "Email", heading: "BROKERAGE SET-UP", sectionIds: ["shared-signatures"] }, // BF_PORTAL_v947_BROKERAGE_SETUP
  { id: "website", label: "Website", heading: "BROKERAGE SET-UP", sectionIds: ["website-kit"] }, // BF_PORTAL_v947_BROKERAGE_SETUP
  { id: "money", label: "Money", heading: "BROKERAGE SET-UP", sectionIds: ["quickbooks", "payments"] },
  { id: "risk", label: "Risk and ID checks", heading: "BROKERAGE SET-UP", sectionIds: ["fraud", "id-verification", "your-services"] },
  { id: "sign-in", label: "Sign-in and security", heading: "BROKERAGE SET-UP", sectionIds: ["security", "microsoft-sign-in"] },
  { id: "records", label: "Privacy and records", heading: "BROKERAGE SET-UP", sectionIds: ["retention", "privacy", "survey"] },
  { id: "integrations", label: "Integrations", heading: "BROKERAGE SET-UP", sectionIds: ["webhooks", "api-keys", "social-accounts"] },
  { id: "deal-tools", label: "Deal tools", heading: "BROKERAGE SET-UP", sectionIds: ["deal-tools"] },
  { id: "your-documents-group", label: "Term sheet templates", heading: "BROKERAGE SET-UP", sectionIds: ["your-documents"] }, // BF_PORTAL_v938_OUR_TERM_SHEET
  { id: "system", label: "System check", heading: "BROKERAGE SET-UP", sectionIds: ["runtime"] },
];

const GROUPED_CSS = `
.settings-grouped { display: flex; gap: 24px; align-items: flex-start; }
.settings-groups { width: 230px; flex: 0 0 230px; display: flex; flex-direction: column; gap: 2px; border: 1px solid var(--ui-border); border-radius: 12px; padding: 10px; position: sticky; top: 12px; }
.settings-group-heading { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; color: var(--ui-text-muted); padding: 10px 10px 4px; }
.settings-group { text-align: left; font-size: 15px; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--ui-text); cursor: pointer; }
.settings-group:hover { background: var(--ui-surface-muted); }
.settings-group.is-active { background: var(--ui-surface-strong); color: var(--ui-text); font-weight: 600; box-shadow: inset 3px 0 0 #2FA86A; }
.settings-content { flex: 1; min-width: 0; }
.settings-group-title { margin: 0 0 8px; font-size: 22px; }
.settings-group-section { padding: 16px 0 24px; border-bottom: 1px solid var(--ui-border); scroll-margin-top: 12px; }
.settings-group-section:last-child { border-bottom: 0; }
.settings-section-title { margin: 0 0 12px; font-size: 18px; }
@media (max-width: 820px) {
  .settings-grouped { flex-direction: column; }
  .settings-groups { width: 100%; flex: none; position: static; flex-direction: row; flex-wrap: wrap; }
  .settings-group-heading { width: 100%; }
}
`;

export default SettingsPage;

// BF_PORTAL_BI_SILO_NAV_v56_SETTINGS_ANCHOR
