import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
import AISessionList from "./AISessionList";
const filters = ["All", "Live Chat", "Credit Readiness", "AI Sessions"];
export default function AiConversations() {
    const [convos, setConvos] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState("All");
    useEffect(() => {
        api.get("/chat/sessions").then((res) => {
            setConvos(Array.isArray(res) ? res : []);
        });
    }, []);
    const visibleConversations = convos.filter((conversation) => {
        if (selectedFilter === "All")
            return true;
        if (selectedFilter === "Live Chat")
            return conversation.type === "live_chat";
        if (selectedFilter === "Credit Readiness")
            return conversation.type === "credit_readiness";
        return false;
    });
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "mb-4 text-xl font-semibold", children: "AI Conversations" }), _jsx("div", { className: "mb-4 flex flex-wrap gap-2", children: filters.map((filter) => (_jsx("button", { className: `rounded px-3 py-1 text-sm ${selectedFilter === filter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`, onClick: () => setSelectedFilter(filter), children: filter }, filter))) }), selectedFilter === "AI Sessions" && _jsx(AISessionList, {}), selectedFilter !== "AI Sessions" && (_jsx("div", { className: "space-y-3", children: visibleConversations.map((c) => (_jsxs("div", { className: "rounded border p-3", children: [_jsxs("div", { children: ["ID: ", c.id] }), _jsxs("div", { children: ["Date: ", new Date(c.created_at).toLocaleString()] }), _jsxs("div", { children: ["User: ", c.user_name || "Unknown"] })] }, c.id))) }))] }));
}
