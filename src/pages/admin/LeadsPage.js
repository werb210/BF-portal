import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchLeads } from "@/api/crm";
const normalizeSource = (source) => {
    if (source === "website_contact" ||
        source === "website_credit_check" ||
        source === "chat_start" ||
        source === "startup_interest" ||
        source === "credit_readiness" ||
        source === "manual" ||
        source === "website" ||
        source === "credit_readiness_bridge") {
        return source;
    }
    return "website_contact";
};
const normalizeStatus = (status) => {
    if (status === "new" || status === "contacted" || status === "converted") {
        return status;
    }
    return "new";
};
const toLead = (lead, index) => {
    const firstName = lead.first_name ?? lead.firstName ?? "";
    const lastName = lead.last_name ?? lead.lastName ?? "";
    const fullName = lead.fullName ?? `${firstName} ${lastName}`.trim();
    return {
        id: lead.id ?? `${lead.email ?? "lead"}-${index}`,
        companyName: lead.companyName ?? lead.company ?? "-",
        fullName: fullName || "-",
        email: lead.email ?? "-",
        phone: lead.phone ?? "-",
        industry: lead.industry,
        productInterest: lead.productInterest,
        industryInterest: lead.industryInterest,
        tags: lead.tags ?? [],
        source: normalizeSource(lead.source),
        status: normalizeStatus(lead.status),
        createdAt: lead.createdAt ?? new Date().toISOString(),
        metadata: {
            yearsInBusiness: lead.metadata?.yearsInBusiness ?? lead.yearsInBusiness,
            annualRevenue: lead.metadata?.annualRevenue ?? lead.annualRevenue,
            monthlyRevenue: lead.metadata?.monthlyRevenue ?? lead.monthlyRevenue,
            requestedAmount: lead.metadata?.requestedAmount ?? lead.requestedAmount,
            creditScoreRange: lead.metadata?.creditScoreRange ?? lead.creditScoreRange,
            revenue: lead.metadata?.revenue ?? lead.revenue,
            accountsReceivable: lead.metadata?.accountsReceivable ?? lead.accountsReceivable ?? lead.ar ?? lead.arBalance,
            availableCollateral: lead.metadata?.availableCollateral ?? lead.availableCollateral,
            score: lead.metadata?.score ?? lead.score
        },
        linkedApplicationId: lead.linkedApplicationId,
        pendingApplicationId: lead.pendingApplicationId
    };
};
export default function LeadsPage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [filter, setFilter] = useState("all");
    const [selectedLead, setSelectedLead] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const loadLeads = async () => {
        try {
            const data = await fetchLeads();
            const payload = Array.isArray(data) ? data : (data.leads ?? []);
            setLeads(payload.map(toLead));
        }
        catch {
            setLeads([]);
        }
    };
    useEffect(() => {
        void loadLeads();
    }, []);
    useEffect(() => {
        const interval = setInterval(() => {
            void loadLeads();
        }, 15000);
        return () => clearInterval(interval);
    }, []);
    const websiteLeads = useMemo(() => leads.filter((l) => l.source === "website_contact" || l.source === "website_credit_check" || l.source === "website"), [leads]);
    const creditReadinessBridgeLeads = useMemo(() => leads.filter((l) => l.source === "credit_readiness_bridge"), [leads]);
    const visibleLeads = useMemo(() => {
        if (filter === "website") {
            return websiteLeads;
        }
        if (filter === "credit_readiness_bridge") {
            return creditReadinessBridgeLeads;
        }
        return leads;
    }, [creditReadinessBridgeLeads, filter, leads, websiteLeads]);
    if (user?.role !== "Admin") {
        return _jsx("div", { children: "Access denied" });
    }
    return (_jsxs("div", { className: "page space-y-4", children: [_jsx("h1", { className: "text-xl font-semibold", children: "Website Leads" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { htmlFor: "lead-filter", className: "text-sm text-slate-600", children: "Filter" }), _jsxs("select", { id: "lead-filter", className: "rounded border border-slate-300 bg-white px-2 py-1 text-sm", value: filter, onChange: (event) => setFilter(event.target.value), children: [_jsx("option", { value: "all", children: "All Leads" }), _jsx("option", { value: "website", children: "Website Leads" }), _jsx("option", { value: "credit_readiness_bridge", children: "Credit Readiness Leads" })] })] }), _jsxs("table", { className: "min-w-full divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm", children: [_jsx("thead", { className: "bg-slate-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Company Name" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Full Name" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Email" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Phone" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Years" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Annual Revenue" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Monthly Revenue" }), _jsx("th", { className: "px-3 py-2 text-left", children: "A/R" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Collateral" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Product" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Industry" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Source" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Tags" })] }) }), _jsx("tbody", { children: visibleLeads.map((lead) => (_jsxs("tr", { className: `cursor-pointer border-t border-slate-100 ${lead.source === "credit_readiness_bridge" && lead.status === "converted" ? "opacity-50" : ""}`, onClick: () => {
                                setSelectedLead(lead);
                                setActiveTab("overview");
                            }, children: [_jsx("td", { className: "px-3 py-2", children: lead.companyName }), _jsx("td", { className: "px-3 py-2", children: lead.fullName }), _jsx("td", { className: "px-3 py-2", children: lead.email }), _jsx("td", { className: "px-3 py-2", children: lead.phone }), _jsx("td", { className: "px-3 py-2", children: lead.metadata?.yearsInBusiness ?? "-" }), _jsx("td", { className: "px-3 py-2", children: lead.metadata?.annualRevenue ?? "-" }), _jsx("td", { className: "px-3 py-2", children: lead.metadata?.monthlyRevenue ?? "-" }), _jsx("td", { className: "px-3 py-2", children: lead.metadata?.accountsReceivable ?? "-" }), _jsx("td", { className: "px-3 py-2", children: lead.metadata?.availableCollateral ?? "-" }), _jsx("td", { className: "px-3 py-2", children: lead.productInterest ?? "-" }), _jsx("td", { className: "px-3 py-2", children: lead.industryInterest ?? lead.industry ?? "-" }), _jsxs("td", { className: "px-3 py-2", children: [lead.source === "credit_readiness_bridge" && (_jsx("span", { className: "px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded", children: "Credit Readiness" })), lead.source !== "credit_readiness_bridge" && (_jsx("span", { className: `badge badge-${lead.source}`, children: lead.source.replace("_", " ") }))] }), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex flex-wrap gap-1", children: [lead.tags?.map((tag) => (_jsx("span", { className: "rounded bg-slate-100 px-2 py-1 text-xs text-slate-700", children: tag }, tag))), lead.tags?.includes("startup_interest") && (_jsx("span", { className: "rounded bg-yellow-500 px-2 py-1 text-xs text-black", children: "Startup" }))] }) })] }, lead.id))) })] }), selectedLead && (_jsxs("div", { className: "rounded-lg border border-slate-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Lead Details" }), _jsx("button", { onClick: () => setSelectedLead(null), children: "Close" })] }), _jsxs("div", { className: "mb-4 flex gap-2 border-b border-slate-200 pb-2", children: [_jsx("button", { className: activeTab === "overview" ? "font-semibold" : "text-slate-600", onClick: () => setActiveTab("overview"), children: "Overview" }), _jsx("button", { className: activeTab === "comms" ? "font-semibold" : "text-slate-600", onClick: () => setActiveTab("comms"), children: "Comms" })] }), activeTab === "overview" && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("strong", { children: "Company:" }), " ", selectedLead.companyName] }), _jsxs("div", { children: [_jsx("strong", { children: "Name:" }), " ", selectedLead.fullName] }), _jsxs("div", { children: [_jsx("strong", { children: "Email:" }), " ", selectedLead.email] }), _jsxs("div", { children: [_jsx("strong", { children: "Phone:" }), " ", selectedLead.phone] }), selectedLead.tags?.includes("startup_interest") && (_jsx("div", { className: "bg-yellow-100 text-yellow-800 px-2 py-1 text-xs inline-block", children: "Startup Interest" })), _jsx("h3", { className: "mt-4 font-semibold", children: "Capital Readiness Data" }), _jsxs("ul", { className: "space-y-1 text-sm", children: [_jsxs("li", { children: ["Years in Business: ", selectedLead.metadata?.yearsInBusiness ?? "-"] }), _jsxs("li", { children: ["Annual Revenue: ", selectedLead.metadata?.annualRevenue ?? "-"] }), _jsxs("li", { children: ["Monthly Revenue: ", selectedLead.metadata?.monthlyRevenue ?? "-"] }), _jsxs("li", { children: ["Requested Amount: ", selectedLead.metadata?.requestedAmount ?? "-"] }), _jsxs("li", { children: ["Credit Score Range: ", selectedLead.metadata?.creditScoreRange ?? "-"] })] }), selectedLead.source === "credit_readiness_bridge" && (_jsxs("div", { className: "mt-6 border-t border-slate-700 pt-4", children: [_jsx("h3", { className: "text-sm font-semibold mb-3 text-slate-300", children: "Credit Readiness Snapshot" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm text-slate-400", children: [_jsx("div", { children: "Industry" }), _jsx("div", { children: selectedLead.industry ?? "-" }), _jsx("div", { children: "Years in Business" }), _jsx("div", { children: selectedLead.metadata?.yearsInBusiness ?? "-" }), _jsx("div", { children: "Annual Revenue" }), _jsx("div", { children: selectedLead.metadata?.annualRevenue ?? "-" }), _jsx("div", { children: "Monthly Revenue" }), _jsx("div", { children: selectedLead.metadata?.monthlyRevenue ?? "-" }), _jsx("div", { children: "Accounts Receivable" }), _jsx("div", { children: selectedLead.metadata?.accountsReceivable ?? "-" }), _jsx("div", { children: "Available Collateral" }), _jsx("div", { children: selectedLead.metadata?.availableCollateral ?? "-" })] })] })), selectedLead.linkedApplicationId && (_jsx("div", { className: "mt-4", children: _jsx("a", { href: `/pipeline/${selectedLead.linkedApplicationId}`, className: "text-blue-400 hover:underline text-sm", children: "View Application" }) })), selectedLead.pendingApplicationId && (_jsx("div", { className: "bg-green-100 text-green-800 p-2 mt-4", children: "User started Credit Readiness. Application continuation available." })), selectedLead.source === "website_contact" && (_jsx("div", { className: "text-sm text-green-600", children: "SMS notification sent to intake specialist." })), selectedLead.source === "credit_readiness" && (_jsx("span", { className: "rounded bg-gray-200 px-2 py-1 text-xs", children: "Credit Readiness" }))] })), activeTab === "comms" && (_jsx("div", { className: "text-sm text-gray-600", children: "Live Chat + Issue Reports will appear here." }))] }))] }));
}
