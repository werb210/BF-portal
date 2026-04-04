import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MayaMetrics from "@/components/MayaMetrics";
function MayaSettings() {
    return _jsx("div", { className: "rounded border border-slate-200 p-4", children: "MayaSettings" });
}
function DriftMonitor() {
    return _jsx("div", { className: "rounded border border-slate-200 p-4", children: "DriftMonitor" });
}
function PerformanceDashboard() {
    return _jsx("div", { className: "rounded border border-slate-200 p-4", children: "PerformanceDashboard" });
}
export default function AdminMaya() {
    return (_jsxs("div", { className: "space-y-4 p-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Maya System Controls" }), _jsx(MayaSettings, {}), _jsx(DriftMonitor, {}), _jsx(PerformanceDashboard, {}), _jsx(MayaMetrics, {})] }));
}
