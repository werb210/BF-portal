import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
import { logger } from "@/utils/logger";
export default function AIKnowledgeBasePage() {
    const [files, setFiles] = useState([]);
    const [file, setFile] = useState(null);
    useEffect(() => {
        api
            .get("/api/admin/ai-documents")
            .then((res) => {
            setFiles(Array.isArray(res) ? res : []);
        })
            .catch((error) => {
            logger.error("Failed to load AI documents", { error });
            setFiles([]);
        });
    }, []);
    async function upload() {
        if (!file)
            return;
        const formData = new FormData();
        formData.append("file", file);
        try {
            await api.post("/api/admin/ai-documents", formData);
            window.location.reload();
        }
        catch (error) {
            logger.error("Failed to upload AI document", { error });
        }
    }
    async function remove(id) {
        try {
            await api.delete(`/admin/ai-documents/${id}`);
            window.location.reload();
        }
        catch (error) {
            logger.error("Failed to delete AI document", { error });
        }
    }
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "AI Knowledge Base" }), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "file", onChange: (e) => setFile(e.target.files?.[0] || null) }), _jsx("button", { onClick: () => void upload(), className: "bg-blue-600 text-white px-4 py-2 rounded", children: "Upload Document" })] }), _jsx("div", { className: "bg-white rounded shadow", children: files.map((entry) => (_jsxs("div", { className: "p-3 border-t flex justify-between", children: [_jsxs("div", { children: [_jsx("div", { children: entry.name }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Embed status: ", entry.embedStatus ?? "Pending", entry.lastEmbeddedAt ? ` · Last embedded ${new Date(entry.lastEmbeddedAt).toLocaleString()}` : ""] })] }), _jsx("button", { onClick: () => void remove(entry.id), className: "text-red-500", children: "Delete" })] }, entry.id))) })] }));
}
