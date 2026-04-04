import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { convertPreApplication, fetchPreApplications, } from "@/api/preApplications";
export default function PreApplications() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [convertingId, setConvertingId] = useState(null);
    async function loadPreApplications() {
        const records = await fetchPreApplications();
        setData(records);
    }
    useEffect(() => {
        loadPreApplications().finally(() => setLoading(false));
    }, []);
    async function handleConvert(id) {
        setConvertingId(id);
        try {
            await convertPreApplication(id);
            await loadPreApplications();
        }
        finally {
            setConvertingId(null);
        }
    }
    if (loading) {
        return _jsx("div", { children: "Loading..." });
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "mb-6 text-2xl font-semibold", children: "Pre-Applications" }), _jsx("div", { className: "space-y-4", children: data.map((item) => (_jsx("div", { className: "rounded-xl border border-slate-700 bg-slate-800 p-4", children: _jsxs("div", { className: "flex justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: item.companyName }), _jsxs("div", { className: "text-sm text-slate-400", children: [item.fullName, " \u2022 ", item.email] }), _jsxs("div", { className: "text-sm text-slate-400", children: ["Revenue: ", item.annualRevenue ?? "N/A", " | Requested:", " ", item.requestedAmount ?? "N/A"] })] }), _jsx("button", { type: "button", onClick: () => handleConvert(item.id), disabled: convertingId === item.id, className: "rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60", children: convertingId === item.id ? "Converting..." : "Convert" })] }) }, item.id))) })] }));
}
