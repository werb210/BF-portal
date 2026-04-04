import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function AISessionList() {
    const [sessions, setSessions] = useState([]);
    useEffect(() => {
        api.get("/portal/ai/sessions").then((res) => {
            setSessions(Array.isArray(res) ? res : []);
        });
    }, []);
    return (_jsx("div", { className: "space-y-4 p-4", children: sessions.map((s) => (_jsxs("div", { className: "rounded border p-3", children: [_jsx("div", { className: "text-sm font-medium", children: s.contactName ?? "Unknown contact" }), _jsx("div", { className: "text-xs text-neutral-500", children: new Date(s.createdAt).toLocaleString() })] }, s.id))) }));
}
