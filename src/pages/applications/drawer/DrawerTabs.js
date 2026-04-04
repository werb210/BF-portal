import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "clsx";
export const TABS = [
    { id: "application", label: "Application" },
    { id: "banking", label: "Banking Analysis" },
    { id: "financials", label: "Financials" },
    { id: "documents", label: "Documents" },
    { id: "credit-summary", label: "Credit Summary" },
    { id: "call-history", label: "Calls" },
    { id: "notes", label: "Notes" },
    { id: "lenders", label: "Lenders" }
];
const DrawerTabs = ({ tabs, selectedTab, onSelect }) => (_jsx("div", { className: "application-drawer__tabs", children: tabs.map((tab) => (_jsxs("button", { className: clsx("application-drawer__tab", { active: selectedTab === tab.id }), onClick: () => onSelect(tab.id), type: "button", children: [_jsx("span", { children: tab.label }), tab.badge ? _jsx("span", { className: "application-drawer__tab-badge", children: tab.badge }) : null] }, tab.id))) }));
export default DrawerTabs;
