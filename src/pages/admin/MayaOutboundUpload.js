import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { api } from "@/api";
export default function MayaOutboundUpload() {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    async function uploadFile() {
        if (!file)
            return;
        const formData = new FormData();
        formData.append("file", file);
        const json = await api("/admin/upload-leads", {
            method: "POST",
            body: formData,
            headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage(`Inserted ${json.inserted} leads.`);
    }
    async function runOutbound() {
        const json = await api("/admin/run-outbound", {
            method: "POST"
        });
        setMessage(`Triggered ${json.callsTriggered} outbound calls.`);
    }
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Maya Outbound Upload" }), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "file", accept: ".xlsx,.xls", onChange: (e) => setFile(e.target.files?.[0] || null) }), _jsx("button", { onClick: uploadFile, className: "bg-blue-600 text-white px-4 py-2 rounded", children: "Upload Excel" })] }), _jsx("div", { children: _jsx("button", { onClick: runOutbound, className: "bg-green-600 text-white px-4 py-2 rounded", children: "Run Outbound Campaign" }) }), message && (_jsx("div", { className: "mt-4 text-sm bg-gray-100 p-3 rounded", children: message }))] }));
}
