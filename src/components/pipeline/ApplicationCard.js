import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import ApplicationDetail from "./ApplicationDetail";
export default function ApplicationCard({ card }) {
    const [tab, setTab] = useState("application");
    const [open, setOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                    background: "#1e293b",
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "10px"
                }, children: [_jsx("strong", { onClick: () => setOpen(true), style: { cursor: "pointer" }, children: card.company }), _jsxs("div", { style: { marginTop: "10px", display: "flex", gap: "6px" }, children: [_jsx("button", { onClick: () => setTab("application"), children: "Application" }), _jsx("button", { onClick: () => setTab("documents"), children: "Documents" }), _jsx("button", { onClick: () => setTab("notes"), children: "Notes" })] }), _jsxs("div", { style: { marginTop: "10px" }, children: [tab === "application" && _jsxs("div", { children: ["Amount: ", card.amount] }), tab === "documents" && _jsx("div", { children: "No documents uploaded" }), tab === "notes" && _jsx("div", { children: "No notes yet" })] })] }), open && _jsx(ApplicationDetail, { id: card.id, onClose: () => setOpen(false) })] }));
}
