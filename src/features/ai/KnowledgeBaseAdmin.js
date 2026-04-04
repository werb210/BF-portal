import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export function KnowledgeBaseAdmin({ isAdmin }) {
    const [entries, setEntries] = useState([]);
    const [content, setContent] = useState("");
    async function load() {
        const data = await api("/api/ai/admin");
        setEntries(data);
    }
    async function addEntry() {
        if (!content.trim())
            return;
        await api('/api/ai/admin', {
            method: 'POST',
            body: { content },
        });
        setContent("");
        await load();
    }
    useEffect(() => {
        if (!isAdmin)
            return;
        void load();
    }, [isAdmin]);
    if (!isAdmin)
        return null;
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "AI Knowledge Base" }), _jsx("textarea", { className: "w-full min-h-32 rounded border border-slate-300 p-2", value: content, onChange: (e) => setContent(e.target.value), placeholder: "Upload product spec, underwriting details, FAQs..." }), _jsx("button", { className: "rounded bg-slate-900 px-4 py-2 text-white", onClick: () => void addEntry(), children: "Add" }), _jsx("ul", { className: "space-y-2", children: entries.map((entry) => (_jsxs("li", { className: "rounded border border-slate-200 p-2 text-sm", children: [entry.content.substring(0, 80), "..."] }, entry.id))) })] }));
}
