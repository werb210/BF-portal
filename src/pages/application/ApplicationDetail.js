import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { api } from "@/api";
import OfferUploader from "@/components/offers/OfferUploader";
import ChatPanel from "@/components/chat/ChatPanel";
const API_PREFIX = "";
const tabs = ["Application", "Banking Analysis", "Financials", "Documents", "Credit Summary", "Notes", "Lenders"];
const defaultMatches = [
    { lender: "Lender A", likelihood: 84 },
    { lender: "Lender B", likelihood: 72 }
];
const ALLOWED_FILE_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg"
]);
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ApplicationDetail = ({ applicationId = "app-1" }) => {
    const [activeTab, setActiveTab] = useState("Application");
    const [selectedLenders, setSelectedLenders] = useState({});
    const [uploadError, setUploadError] = useState("");
    const handleDocAction = async (status) => {
        const reason = status === "rejected" ? window.prompt("Rejection reason") : "Accepted";
        if (!reason)
            return;
        await api.post(`${API_PREFIX}/applications/${applicationId}/documents/review`, { status, reason, notifyChannels: ["sms", "portal"] });
    };
    const sendSelected = async () => {
        const lenders = Object.entries(selectedLenders)
            .filter(([, selected]) => selected)
            .map(([lender]) => lender);
        await api.post("/api/lender-submissions", { applicationId, lenders });
    };
    const handleFileSelection = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!ALLOWED_FILE_TYPES.has(file.type)) {
            setUploadError("Invalid file type. Allowed: PDF, DOCX, XLSX, PNG, JPG.");
            event.target.value = "";
            return;
        }
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            setUploadError("File is too large. Max size is 25 MB.");
            event.target.value = "";
            return;
        }
        setUploadError("");
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex gap-2 overflow-auto", children: tabs.map((tab) => (_jsx("button", { type: "button", onClick: () => setActiveTab(tab), children: tab }, tab))) }), activeTab === "Documents" ? (_jsxs("div", { className: "space-x-2", children: [_jsx("button", { type: "button", children: "View" }), _jsx("button", { type: "button", children: "Download" }), _jsx("button", { type: "button", onClick: () => void handleDocAction("accepted"), children: "Accept" }), _jsx("button", { type: "button", onClick: () => void handleDocAction("rejected"), children: "Reject" })] })) : null, activeTab === "Lenders" ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Likelihood %" }), _jsx("th", { children: "Lender" }), _jsx("th", { children: "Send" }), _jsx("th", { children: "Upload Term Sheet" })] }) }), _jsx("tbody", { children: defaultMatches.map((match) => (_jsxs("tr", { children: [_jsxs("td", { children: [match.likelihood, "%"] }), _jsx("td", { children: match.lender }), _jsx("td", { children: _jsx("input", { type: "checkbox", checked: Boolean(selectedLenders[match.lender]), onChange: (event) => setSelectedLenders((prev) => ({ ...prev, [match.lender]: event.target.checked })) }) }), _jsx("td", { children: _jsx("input", { type: "file", onChange: handleFileSelection }) })] }, match.lender))) })] }), uploadError ? _jsx("div", { role: "alert", children: uploadError }) : null, _jsx("button", { type: "button", onClick: () => void sendSelected(), children: "Send Selected" })] })) : null, activeTab === "Notes" ? _jsx(ChatPanel, { applicationId: applicationId }) : null, activeTab === "Financials" ? _jsx(OfferUploader, { applicationId: applicationId }) : null] }));
};
export default ApplicationDetail;
