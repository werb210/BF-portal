import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { deleteIssue, fetchWebsiteIssues, resolveIssue } from "@/api/issues";
export default function IssueInboxPage() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let mounted = true;
        const loadIssues = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchWebsiteIssues();
                if (!mounted)
                    return;
                setIssues(Array.isArray(data) ? data : []);
            }
            catch {
                if (!mounted)
                    return;
                setError("Unable to load issues right now.");
            }
            finally {
                if (mounted)
                    setLoading(false);
            }
        };
        void loadIssues();
        return () => {
            mounted = false;
        };
    }, []);
    async function markResolved(id) {
        try {
            await resolveIssue(id);
            setIssues((previous) => previous.map((issue) => (issue.id === id ? { ...issue, resolved: true } : issue)));
        }
        catch {
            setError("Unable to resolve this issue right now.");
        }
    }
    async function removeIssue(id) {
        try {
            await deleteIssue(id);
            setIssues((previous) => previous.filter((issue) => issue.id !== id));
        }
        catch {
            setError("Unable to delete this issue right now.");
        }
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Reported Issues" }), loading && _jsx("p", { className: "text-sm text-slate-500", children: "Loading issues\u2026" }), error && _jsx("p", { className: "mb-3 text-sm text-red-600", children: error }), issues.map((issue) => (_jsxs("div", { className: "mb-4 border p-4", children: [_jsx("div", { className: "text-sm", children: issue.message }), issue.screenshot || issue.screenshotUrl ? (_jsx("img", { src: issue.screenshotUrl ?? issue.screenshot, className: "mt-2 max-h-44 max-w-md border", alt: "Issue screenshot" })) : null, _jsxs("div", { className: "mt-2 text-xs text-slate-500", children: [issue.sessionId ?? issue.id, issue.createdAt ? ` · ${new Date(issue.createdAt).toLocaleString()}` : ""] }), _jsxs("div", { className: "mt-2 flex items-center gap-4", children: [_jsx("button", { onClick: () => void markResolved(issue.id), className: "text-sm text-emerald-700", disabled: issue.resolved, children: issue.resolved ? "Resolved" : "Mark resolved" }), _jsx("button", { onClick: () => void removeIssue(issue.id), className: "text-sm text-red-600", children: "Delete" })] })] }, issue.id)))] }));
}
