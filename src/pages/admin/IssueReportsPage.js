import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
export default function IssueReportsPage() {
    const [reports, setReports] = useState([]);
    useEffect(() => {
        api.get("/api/admin/issue-reports").then((res) => {
            setReports(Array.isArray(res) ? res : []);
        });
    }, []);
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Reported Issues" }), reports.map((report, i) => (_jsxs("div", { className: "bg-white p-4 shadow rounded space-y-2", children: [_jsx("div", { className: "font-semibold", children: report.description }), _jsx("div", { className: "text-sm text-gray-500", children: report.createdAt ? new Date(report.createdAt).toLocaleString() : "—" }), report.screenshotUrl && _jsx("img", { src: report.screenshotUrl, className: "max-w-md rounded border", alt: "Issue screenshot" })] }, report.id ?? i)))] }));
}
