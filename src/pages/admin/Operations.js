import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import api from "@/api";
import { Navigate } from "react-router-dom";
import CapitalScorePreview from "@/components/CapitalScorePreview";
const API_PREFIX = "";
export default function Operations() {
    const auth = useAuth();
    const [contacts, setContacts] = useState([]);
    const [issues, setIssues] = useState([]);
    const [chats, setChats] = useState([]);
    const [issueFilter, setIssueFilter] = useState("ALL");
    if (auth.status !== "authenticated" || auth.user.role !== "Admin") {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    async function refreshData() {
        const [contactsRes, issuesRes, chatsRes] = await Promise.all([
            api.get("/admin/contacts"),
            api.get("/admin/issues"),
            api.get("/admin/chats"),
        ]);
        setContacts(contactsRes);
        setIssues(issuesRes);
        setChats(chatsRes);
    }
    async function updateIssueStatus(id, status) {
        const updateRes = await api.patch(`${API_PREFIX}/admin/issues/${id}`, { status });
        if (!updateRes) {
            throw new Error("Failed to update issue");
        }
        await refreshData();
    }
    useEffect(() => {
        void refreshData();
    }, []);
    return _jsxs("div", { style: { padding: 24 }, children: [_jsx("h1", { children: "Operations Dashboard" }), _jsxs("section", { children: [_jsx("h2", { children: "Capital Readiness Preview" }), _jsx(CapitalScorePreview, {})] }), _jsxs("section", { children: [_jsx("h2", { children: "New Contacts" }), contacts.map((c) => _jsxs("div", { style: { border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, marginBottom: 16 }, children: [_jsx("strong", { children: c.company }), " \u2014 ", c.firstName, " ", c.lastName, _jsxs("div", { children: [c.email, " | ", c.phone] })] }, c.id))] }), _jsxs("section", { children: [_jsx("h2", { children: "Issue Reports" }), _jsx("label", { htmlFor: "statusFilter", className: "sr-only", children: "Filter by status" }), _jsxs("select", { id: "statusFilter", onChange: (e) => setIssueFilter(e.target.value), children: [_jsx("option", { value: "ALL", children: "All" }), _jsx("option", { value: "OPEN", children: "Open" }), _jsx("option", { value: "IN_PROGRESS", children: "In Progress" }), _jsx("option", { value: "CLOSED", children: "Closed" })] }), [...issues].filter((i) => issueFilter === "ALL" || i.status === issueFilter).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((i) => _jsxs("div", { style: { border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, marginBottom: 16 }, children: [_jsx("p", { children: i.message }), i.screenshotBase64 && _jsx("img", { src: `data:image/png;base64,${i.screenshotBase64}`, alt: "Operations overview graphic", style: { maxWidth: 400 } }), _jsxs("div", { children: ["Status: ", i.status] }), _jsx("button", { onClick: () => void updateIssueStatus(i.id, "IN_PROGRESS"), children: "Start" }), _jsx("button", { onClick: () => void updateIssueStatus(i.id, "CLOSED"), children: "Close" })] }, i.id))] }), _jsxs("section", { children: [_jsx("h2", { children: "Chat Escalations" }), chats.map((chat) => _jsxs("div", { style: { border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, marginBottom: 16 }, children: [_jsxs("strong", { children: [chat.name, " (", chat.email, ")"] }), _jsx("pre", { children: chat.transcript })] }, chat.id))] })] });
}
