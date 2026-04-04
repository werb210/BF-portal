import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getAIKnowledge } from "@/api/support";
import { api } from "@/api";
export default function KnowledgeManager() {
    const [docs, setDocs] = useState([]);
    useEffect(() => {
        void load();
    }, []);
    async function load() {
        const data = await getAIKnowledge();
        setDocs(data.documents || []);
    }
    async function upload(file) {
        const payload = new FormData();
        payload.append("file", file);
        await api('/api/ai/knowledge', {
            method: 'POST',
            body: payload,
            headers: { "Content-Type": "multipart/form-data" },
        });
        void load();
    }
    return (_jsxs("div", { children: [_jsx("h2", { children: "AI Knowledge Base" }), _jsx("input", { type: "file", onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        void upload(file);
                    }
                } }), _jsx("ul", { children: docs.map((d) => (_jsx("li", { children: d.filename }, d.id))) })] }));
}
