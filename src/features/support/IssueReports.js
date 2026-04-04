import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
function IssueReports({ isAdmin = true }) {
    const [issues, setIssues] = useState([]);
    useEffect(() => {
        if (!isAdmin) {
            return;
        }
        void load();
    }, [isAdmin]);
    async function load() {
        const data = await api("/api/support/report");
        setIssues(Array.isArray(data) ? data : (data.issues ?? []));
    }
    async function resolveIssue(id) {
        await api(`/api/support/report/${id}`, { method: "DELETE" });
        setIssues((prev) => prev.filter((issue) => issue.id !== id));
    }
    if (!isAdmin) {
        return null;
    }
    return (_jsxs("div", { children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Issue Reports" }), _jsx("div", { className: "space-y-4", children: issues.map((issue) => (_jsxs("div", { className: "rounded border border-slate-200 p-4", children: [_jsxs("p", { className: "mb-2", children: [_jsx("strong", { children: "Description:" }), " ", issue.description] }), issue.crmRecordUrl ? (_jsx("p", { className: "mb-2 text-sm", children: _jsx("a", { href: issue.crmRecordUrl, target: "_blank", rel: "noreferrer", className: "text-blue-700 underline", children: "Open CRM record" }) })) : null, issue.screenshot ? (_jsx("img", { src: issue.screenshot, alt: "Reported issue screenshot", className: "mb-3 max-h-64 rounded object-contain" })) : null, _jsx("button", { onClick: () => resolveIssue(issue.id), className: "rounded bg-emerald-600 px-3 py-1 text-white", children: "Mark Resolved" })] }, issue.id))) })] }));
}
export default IssueReports;
export { IssueReports };
