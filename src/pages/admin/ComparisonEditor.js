import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api";
export default function ComparisonEditor() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    async function load() {
        const json = await api("/comparison");
        setData(json);
    }
    if (user?.role !== "Admin") {
        return _jsx("div", { children: "Access denied" });
    }
    return (_jsxs("div", { className: "page space-y-4", children: [_jsx("h1", { className: "text-xl font-semibold", children: "Comparison Editor" }), _jsx("button", { type: "button", onClick: load, className: "rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100", children: "Load Comparison" }), data !== null && (_jsx("pre", { className: "overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100", children: JSON.stringify(data, null, 2) }))] }));
}
