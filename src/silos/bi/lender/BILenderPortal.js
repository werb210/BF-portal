import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
import ActivityTimeline from "../components/ActivityTimeline";
const ALLOWED_FILE_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg"
]);
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
export default function BILenderPortal() {
    const [apps, setApps] = useState([]);
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        void load();
    }, []);
    async function load() {
        const data = await api("/api/bi/lender/applications");
        setApps(data);
    }
    async function uploadDocs(appId, files) {
        if (!files)
            return;
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (!file)
                continue;
            if (!ALLOWED_FILE_TYPES.has(file.type)) {
                toast.error("Invalid file type. Allowed: PDF, DOCX, XLSX, PNG, JPG.");
                return;
            }
            if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                toast.error("File is too large. Max size is 25 MB.");
                return;
            }
            formData.append("files", file);
        }
        await api(`/api/bi/application/${appId}/documents`, {
            method: "POST",
            body: formData
        });
        toast.success("Documents uploaded");
        void load();
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-6", children: [_jsx("h2", { className: "text-3xl font-semibold mb-6", children: "Lender Applications" }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-5", children: [_jsx("div", { className: "lg:col-span-2 space-y-3", children: apps.map((app) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-4", onClick: () => setSelected(app), style: { cursor: "pointer" }, children: [_jsx("strong", { children: app.primary_contact_name || "Applicant" }), _jsxs("p", { children: ["Stage: ", app.stage || "-"] }), _jsxs("p", { children: ["Premium: $", app.premium_calc?.annualPremium?.toLocaleString() || "-"] })] }, app.id))) }), _jsx("div", { className: "lg:col-span-3 bg-brand-bgAlt border border-card rounded-xl p-6", children: selected && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "text-xl font-semibold", children: "Application Detail" }), _jsxs("p", { children: ["Stage: ", selected.stage || "-"] }), _jsxs("p", { children: ["Premium: $", selected.premium_calc?.annualPremium?.toLocaleString() || "-"] }), _jsx("h4", { className: "mt-4 mb-2", children: "Upload Additional Documents" }), _jsx("input", { type: "file", multiple: true, onChange: (e) => void uploadDocs(selected.id, e.target.files) }), _jsx("div", { className: "mt-6", children: _jsx(ActivityTimeline, { applicationId: selected.id }) })] })) })] })] }));
}
