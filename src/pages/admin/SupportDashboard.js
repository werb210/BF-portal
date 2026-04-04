import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { SupportService } from "@/services/supportService";
export default function SupportDashboard() {
    const [issues, setIssues] = useState([]);
    const [chats, setChats] = useState([]);
    useEffect(() => {
        async function load() {
            const issueRes = await SupportService.listIssues();
            const chatRes = await SupportService.listEscalations();
            setIssues(issueRes.data || []);
            setChats(chatRes.data || []);
        }
        void load();
    }, []);
    return (_jsxs("div", { className: "p-6 space-y-8", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Support Center" }), _jsxs("div", { children: [_jsx("h2", { className: "font-semibold mb-2", children: "Chat Escalations" }), chats.map((c) => (_jsxs("div", { className: "border p-3 mb-2", children: [_jsx("div", { className: "text-sm", children: c.source }), _jsx("div", { className: "text-xs text-gray-500", children: c.created_at })] }, c.id)))] }), _jsxs("div", { children: [_jsx("h2", { className: "font-semibold mb-2", children: "Issue Reports" }), issues.map((i) => (_jsxs("div", { className: "border p-3 mb-2", children: [_jsx("div", { children: i.description }), i.screenshotBase64 && (_jsx("img", { src: `data:image/png;base64,${i.screenshotBase64}`, className: "mt-2 max-h-48 border", alt: "Issue screenshot preview" }))] }, i.id)))] })] }));
}
