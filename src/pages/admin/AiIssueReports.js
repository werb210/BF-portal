import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import RequireRole from "@/components/auth/RequireRole";
import { useAiIssuesQuery, useDeleteIssueMutation, useResolveIssueMutation } from "@/services/aiService";
const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleString();
};
const toProtectedScreenshotUrl = (url) => {
    if (!url)
        return null;
    if (url.startsWith("/"))
        return url;
    return null;
};
const AiIssueReportsContent = () => {
    const { data: issues = [], isLoading } = useAiIssuesQuery();
    const resolveMutation = useResolveIssueMutation();
    const deleteMutation = useDeleteIssueMutation();
    const [selectedIssue, setSelectedIssue] = useState(null);
    return (_jsxs("div", { className: "page", children: [_jsxs(Card, { title: "AI Issue Reports", children: [isLoading ? _jsx("p", { children: "Loading issue reports..." }) : null, !isLoading && issues.length === 0 ? _jsx("p", { children: "No issue reports available." }) : null, !isLoading && issues.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-200 text-left text-slate-600", children: [_jsx("th", { className: "px-3 py-2", children: "Status" }), _jsx("th", { className: "px-3 py-2", children: "Context" }), _jsx("th", { className: "px-3 py-2", children: "Page URL" }), _jsx("th", { className: "px-3 py-2", children: "Description" }), _jsx("th", { className: "px-3 py-2", children: "Screenshot" }), _jsx("th", { className: "px-3 py-2", children: "Date" }), _jsx("th", { className: "px-3 py-2", children: "Assigned to" }), _jsx("th", { className: "px-3 py-2", children: "Action" })] }) }), _jsx("tbody", { children: issues.map((issue) => {
                                        const protectedUrl = toProtectedScreenshotUrl(issue.screenshotUrl);
                                        return (_jsxs("tr", { className: "border-b border-slate-100", children: [_jsx("td", { className: "px-3 py-2", children: issue.status }), _jsx("td", { className: "px-3 py-2", children: issue.context ?? "website" }), _jsx("td", { className: "px-3 py-2 max-w-[180px] truncate", children: issue.pageUrl }), _jsx("td", { className: "px-3 py-2 max-w-[220px] truncate", children: issue.description }), _jsx("td", { className: "px-3 py-2", children: protectedUrl ? (_jsx("img", { src: protectedUrl, alt: "Issue screenshot preview", className: "h-10 w-16 rounded border border-slate-200 object-cover" })) : ("Protected") }), _jsx("td", { className: "px-3 py-2", children: formatDate(issue.createdAt) }), _jsx("td", { className: "px-3 py-2", children: issue.assignedTo ?? "Unassigned" }), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => setSelectedIssue(issue), className: "rounded border border-slate-300 px-2 py-1 text-xs", children: "View" }), _jsx("button", { type: "button", disabled: issue.status === "Resolved", onClick: () => resolveMutation.mutate(issue.id), className: "rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50", children: "Mark resolved" }), _jsx("button", { type: "button", disabled: issue.status !== "Resolved", onClick: () => deleteMutation.mutate(issue.id), className: "rounded bg-rose-600 px-2 py-1 text-xs text-white disabled:opacity-50", children: "Delete" })] }) })] }, issue.id));
                                    }) })] }) })) : null] }), _jsxs("div", { className: `fixed inset-0 z-40 transition ${selectedIssue ? "pointer-events-auto" : "pointer-events-none"}`, "aria-hidden": !selectedIssue, children: [_jsx("div", { className: `absolute inset-0 bg-slate-900/30 transition-opacity ${selectedIssue ? "opacity-100" : "opacity-0"}`, onClick: () => setSelectedIssue(null) }), _jsxs("aside", { className: `absolute right-0 top-0 h-full w-full max-w-md bg-white p-4 shadow-2xl transition-transform ${selectedIssue ? "translate-x-0" : "translate-x-full"}`, children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "text-base font-semibold", children: "Issue details" }), _jsx("button", { type: "button", onClick: () => setSelectedIssue(null), className: "text-sm text-slate-500", children: "Close" })] }), selectedIssue ? (_jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "Context:" }), " ", selectedIssue.context ?? "website"] }), _jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "Page:" }), " ", selectedIssue.pageUrl] }), _jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "Description:" }), " ", selectedIssue.description] }), _jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "Browser:" }), " ", selectedIssue.browserInfo ?? "—"] }), _jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "Timestamp:" }), " ", formatDate(selectedIssue.createdAt)] })] })) : null] })] })] }));
};
const AiIssueReports = () => (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(AiIssueReportsContent, {}) }));
export default AiIssueReports;
