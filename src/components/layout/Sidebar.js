import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import { hasRequiredRole, resolveUserRole } from "@/utils/roles";
import { BUSINESS_UNIT_CONFIG } from "@/config/businessUnitConfig";
const navigationSections = [
    {
        items: [
            { label: "Dashboard", path: "/dashboard" },
            { label: "Applications", path: "/applications" },
            { label: "CRM", path: "/crm" },
            { label: "Leads", path: "/leads" },
            { label: "Communications", path: "/communications" },
            { label: "Readiness Leads", path: "/portal/readiness", roles: ["Admin", "Staff"] },
            { label: "Capital Readiness", path: "/continuations", roles: ["Admin", "Staff"] },
            { label: "Live Chat", path: "/chat" },
            { label: "AI Chat", path: "/ai-chat", roles: ["Admin", "Staff"] },
            { label: "AI Comms", path: "/ai-comms", roles: ["Admin", "Staff"] },
            { label: "Issues", path: "/issues", roles: ["Admin", "Staff"] },
            { label: "Calendar", path: "/calendar" },
            { label: "Marketing", path: "/marketing" },
            { label: "Lenders", path: "/lenders" },
            { label: "Settings", path: "/settings" }
        ]
    },
    {
        title: "AI & Support",
        items: [
            { label: "AI Knowledge", path: "/admin/ai", roles: ["Admin"] },
            { label: "Support", path: "/admin/support", roles: ["Admin"] },
            { label: "Analytics", path: "/admin/analytics", roles: ["Admin"] },
            { label: "Analytics Events", path: "/admin/analytics-events", roles: ["Admin"] },
            { label: "Website Leads", path: "/admin/website-leads", roles: ["Admin"] },
            { label: "Website Leads Table", path: "/admin/leads", roles: ["Admin"] },
            { label: "AI Knowledge Base", path: "/admin/ai-knowledge", roles: ["Admin"] },
            { label: "AI Knowledge Upload", path: "/admin/ai-knowledge-upload", roles: ["Admin"] },
            { label: "Comparison Editor", path: "/admin/comparison", roles: ["Admin"] },
            { label: "Issue Reports", path: "/admin/issue-reports", roles: ["Admin"] },
            { label: "Live Chat Queue", path: "/admin/live-chat", roles: ["Admin"] },
            { label: "Conversions", path: "/admin/conversions", roles: ["Admin"] },
            { label: "AI Live Chat", path: "/portal/ai", roles: ["Admin", "Staff"] },
            { label: "Chats", path: "/admin/ai/chats", roles: ["Admin", "Staff"] },
            { label: "AI Policy", path: "/admin/ai-policy", roles: ["Admin"] },
            { label: "Issues", path: "/admin/ai/issues", roles: ["Admin", "Staff"] },
            { label: "Operations", path: "/admin/operations", roles: ["Admin"] },
            { label: "Maya Intelligence", path: "/admin/maya", roles: ["Admin"] },
            { label: "Maya Outbound Upload", path: "/admin/maya-outbound", roles: ["Admin"] }
        ]
    }
];
const Sidebar = ({ isOpen, onClose }) => {
    const { silo } = useSilo();
    const businessUnitConfig = BUSINESS_UNIT_CONFIG[silo] ?? BUSINESS_UNIT_CONFIG.BF;
    const { user } = useAuth();
    const role = resolveUserRole(user?.role ?? null);
    const canViewStaffNav = role === "Admin" || role === "Staff";
    const visibleSections = canViewStaffNav
        ? navigationSections
            .map((section) => ({
            ...section,
            items: section.items.filter((item) => {
                if (!businessUnitConfig.allowClientComms && ["/communications", "/chat", "/ai-comms", "/ai-chat"].includes(item.path)) {
                    return false;
                }
                return !item.roles || hasRequiredRole(role, item.roles);
            })
        }))
            .filter((section) => section.items.length > 0)
        : [];
    return (_jsxs("aside", { className: `sidebar ${isOpen ? "sidebar--open" : ""}`, children: [_jsxs("div", { className: "sidebar__header", children: [_jsxs("span", { children: [silo, " Portal"] }), _jsx("button", { type: "button", className: "sidebar__close", onClick: onClose, "aria-label": "Close navigation", children: "\u00D7" })] }), _jsx("nav", { className: "sidebar__nav", children: visibleSections.map((section) => (_jsxs("div", { className: "mb-4", children: [section.title ? _jsx("p", { className: "px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500", children: section.title }) : null, section.items.map((item) => (_jsx(NavLink, { to: item.path, end: item.path === "/dashboard", className: ({ isActive }) => `sidebar__link ${isActive ? "sidebar__link--active" : ""}`, onClick: onClose, children: item.label }, item.path)))] }, section.title ?? "main"))) })] }));
};
export default Sidebar;
