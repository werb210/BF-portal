import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { api } from "@/api";
export default function AiKnowledgeUpload() {
    const [file, setFile] = useState(null);
    async function upload() {
        if (!file)
            return;
        const form = new FormData();
        form.append("file", file);
        await api.post("/api/ai/admin/upload", form);
        throw new Error("Uploaded and ingested.");
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "mb-4 text-xl font-semibold", children: "Upload Product Sheet" }), _jsx("input", { type: "file", accept: ".pdf", onChange: (e) => setFile(e.target.files?.[0] || null) }), _jsx("button", { onClick: () => void upload(), className: "ml-3 rounded bg-black px-4 py-2 text-white", children: "Upload" })] }));
}
