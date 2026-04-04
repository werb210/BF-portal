import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import ErrorBoundary from "@/components/ErrorBoundary";
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
    const tabs = useMemo(() => [
        { id: "users", label: "User Management", visible: isAdmin, content: _jsx(UserManagement, {}) },
        { id: "support", label: "Support Queue", visible: canViewSupport, content: _jsx(SupportQueue, {}) },
        { id: "issues", label: "Issue Reports", visible: canViewSupport, content: _jsx(IssueReports, {}) },
        { id: "ai-knowledge", label: "AI Knowledge", visible: isAdmin, content: isAdmin ? _jsx(KnowledgeManager, {}) : null },
        { id: "web-leads", label: "Website Leads", visible: canViewSupport, content: _jsx(WebLeads, {}) },
        { id: "live-activity", label: "Live Activity", visible: canViewSupport, content: _jsx(LiveActivity, {}) },
        { id: "profile", label: "My Profile", visible: true, content: _jsx(ProfileSettings, {}) },
        { id: "branding", label: "Branding", visible: true, content: _jsx(BrandingSettings, {}) },
        { id: "runtime", label: "Runtime Verification", visible: true, content: _jsx(RuntimeSettings, {}) }
    ], [canViewSupport, isAdmin]);
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
    return (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(ErrorBoundary, { children: _jsx(SettingsSectionLayout, { children: showOverview ? (_jsx(SettingsOverview, {})) : availableTabs.length === 0 ? (_jsxs("div", { className: "settings-panel", role: "status", children: [_jsx("h2", { children: "Settings" }), _jsx("p", { children: "No settings sections are available for your account." })] })) : (_jsxs("div", { className: "settings-layout", children: [_jsx("div", { className: "settings-tabs", role: "tablist", "aria-label": "Settings tabs", children: availableTabs.map((tab) => (_jsx("button", { type: "button", role: "tab", "aria-selected": tab.id === resolvedTabId, className: `settings-tab ${tab.id === resolvedTabId ? "is-active" : ""}`, onClick: () => navigate(`/settings/${tab.id}`), children: tab.label }, tab.id))) }), _jsx("div", { className: "settings-content", role: "tabpanel", children: _jsx(ErrorBoundary, { children: activeTab?.content }) })] })) }) }) }));
};
export default SettingsPage;
