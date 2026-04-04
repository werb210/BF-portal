import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import ContactsPage from "./contacts/ContactsPage";
import CompaniesPage from "./companies/CompaniesPage";
import TimelineFeed from "./timeline/TimelineFeed";
import RequireRole from "@/components/auth/RequireRole";
import { ContactSubmissions } from "@/features/support/ContactSubmissions";
import { useAuth } from "@/hooks/useAuth";
import ContinuationLeadsPanel from "./ContinuationLeadsPanel";
import CreditReadinessList from "@/components/CreditReadinessList";
import { AccessRestricted } from "@/components/AccessRestricted";
const CRMContent = () => {
    const [view, setView] = useState("contacts");
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    return (_jsxs("div", { className: "page", children: [_jsx(Card, { title: "CRM Navigation", actions: _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setView("contacts"), children: "Contacts" }), _jsx("button", { onClick: () => setView("companies"), children: "Companies" }), _jsx("button", { onClick: () => setView("timeline"), children: "Global Timeline" }), isAdmin && _jsx("button", { onClick: () => setView("website-leads"), children: "Website Leads" }), isAdmin && _jsx("button", { onClick: () => setView("continuations"), children: "Continuations" }), isAdmin && _jsx("button", { onClick: () => setView("credit-readiness"), children: "Credit Readiness" })] }), children: _jsx("p", { children: "Manage contacts, companies, communications, and timeline entries across BF, BI, and SLF silos." }) }), view === "contacts" && _jsx(ContactsPage, {}), view === "companies" && _jsx(CompaniesPage, {}), view === "timeline" && (_jsx(Card, { title: "Global Timeline", children: _jsx(TimelineFeed, { entityType: "contact", entityId: "c1" }) })), view === "website-leads" && (_jsx(Card, { title: "Website Contact Leads", children: _jsx(ContactSubmissions, { isAdmin: isAdmin }) })), view === "continuations" && (_jsx(Card, { title: "Website Continuations", children: _jsx(ContinuationLeadsPanel, {}) })), view === "credit-readiness" && (_jsx(Card, { title: "Credit Readiness", children: _jsx(CreditReadinessList, {}) }))] }));
};
const CRMPage = () => {
    const { user } = useAuth();
    const role = user?.role?.toLowerCase();
    if (role !== "admin" && role !== "staff") {
        return _jsx(AccessRestricted, {});
    }
    return (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(CRMContent, {}) }));
};
export default CRMPage;
