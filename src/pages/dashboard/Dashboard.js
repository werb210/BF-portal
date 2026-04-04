import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import PipelineOverview from "@/components/dashboard/PipelineOverview";
import UrgentActions from "@/components/dashboard/UrgentActions";
import DocumentHealth from "@/components/dashboard/DocumentHealth";
import LenderActivity from "@/components/dashboard/LenderActivity";
import OfferFeed from "@/components/dashboard/OfferFeed";
import DealMetrics from "@/components/dashboard/DealMetrics";
const Dashboard = () => {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Dashboard Overview" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(PipelineOverview, {}), _jsx(UrgentActions, {})] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(DocumentHealth, {}), _jsx(LenderActivity, {})] }), _jsx(OfferFeed, {}), _jsx(DealMetrics, {})] }));
};
export default Dashboard;
