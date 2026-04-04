import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api as api } from "@/api";
export default function MayaMetrics() {
    const [metrics, setMetrics] = useState({});
    useEffect(() => {
        api.get("/api/maya/metrics").then((result) => {
            setMetrics(result ?? {});
        });
    }, []);
    return (_jsxs("div", { className: "space-y-2 rounded border border-slate-200 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Observability" }), _jsxs("div", { children: ["ML confidence averages: ", metrics.confidenceAverage ?? "—"] }), _jsxs("div", { children: ["Drift score: ", metrics.driftScore ?? "—"] }), _jsxs("div", { children: ["Lead conversion rate: ", metrics.leadConversionRate ?? "—"] }), _jsxs("div", { children: ["System uptime: ", metrics.systemUptime ?? "—"] })] }));
}
