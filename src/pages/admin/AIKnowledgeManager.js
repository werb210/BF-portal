import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AIService } from "@/services/aiService";
export default function AIKnowledgeManager() {
    const [items, setItems] = useState([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    async function load() {
        const res = await AIService.listKnowledge();
        if (Array.isArray(res)) {
            setItems(res);
            return;
        }
        setItems(res?.data ?? []);
    }
    async function save() {
        if (!title || !content)
            return;
        await AIService.createKnowledge({ title, content, sourceType: "portal" });
        setTitle("");
        setContent("");
        await load();
    }
    useEffect(() => {
        void load();
    }, []);
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "AI Knowledge Manager" }), _jsxs("div", { className: "space-y-2", children: [_jsx("input", { className: "border p-2 w-full", placeholder: "Title", value: title, onChange: (e) => setTitle(e.target.value) }), _jsx("textarea", { className: "border p-2 w-full h-40", placeholder: "Content", value: content, onChange: (e) => setContent(e.target.value) }), _jsx("button", { onClick: () => void save(), className: "bg-blue-600 text-white px-4 py-2 rounded", children: "Save Knowledge" })] }), _jsxs("div", { children: [_jsx("h2", { className: "font-semibold mb-2", children: "Existing Entries" }), items.map((item) => (_jsxs("div", { className: "border p-3 mb-2", children: [_jsx("div", { className: "font-bold", children: item.title }), _jsx("div", { className: "text-sm text-gray-600", children: item.source_type })] }, item.id)))] })] }));
}
