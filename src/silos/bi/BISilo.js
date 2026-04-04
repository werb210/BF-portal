import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Route, Routes } from "react-router-dom";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import BICRM from "./crm/BICRM";
import BILenderPortal from "./lender/BILenderPortal";
import BIApplicationDetail from "./pipeline/BIApplicationDetail";
import BIReports from "./reports/BIReports";
import { biPipelineAdapter } from "./bi.pipeline.adapter";
export default function BISilo() {
    return (_jsxs("div", { className: "min-h-screen bg-brand-bg text-white", children: [_jsx("header", { className: "bg-brand-bg border-b border-subtle", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-4 flex justify-between items-center", children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Boreal Insurance \u2013 Portal" }), _jsxs("nav", { className: "space-x-6 text-sm text-white/80", children: [_jsx(Link, { to: "pipeline", className: "hover:text-white", children: "Pipeline" }), _jsx(Link, { to: "crm", className: "hover:text-white", children: "CRM" }), _jsx(Link, { to: "reports", className: "hover:text-white", children: "Reports" }), _jsx(Link, { to: "lender", className: "hover:text-white", children: "Lender" })] })] }) }), _jsx("main", { className: "max-w-7xl mx-auto px-6 py-14 md:py-20", children: _jsxs(Routes, { children: [_jsx(Route, { path: "pipeline", element: _jsx(PipelineEngineProvider, { config: {
                                    businessUnit: "BI",
                                    api: biPipelineAdapter,
                                }, children: _jsx(PipelinePage, {}) }) }), _jsx(Route, { path: "pipeline/:id", element: _jsx(BIApplicationDetail, {}) }), _jsx(Route, { path: "crm", element: _jsx(BICRM, {}) }), _jsx(Route, { path: "reports", element: _jsx(BIReports, {}) }), _jsx(Route, { path: "lender", element: _jsx(BILenderPortal, {}) })] }) })] }));
}
