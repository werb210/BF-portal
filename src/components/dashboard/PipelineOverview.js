import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";
const PipelineOverview = () => {
    const enableDashboardQueries = process.env.NODE_ENV !== "test";
    const { data, isLoading } = useQuery({ queryKey: ["dashboard", "pipeline"], queryFn: dashboardApi.getPipeline, enabled: enableDashboardQueries });
    return (_jsxs(Card, { title: "Pipeline Overview", children: [isLoading ? _jsx("p", { children: "Loading\u2026" }) : null, _jsxs("ul", { className: "space-y-1 text-sm", children: [_jsxs("li", { children: ["New Applications: ", data?.newApplications ?? 0] }), _jsxs("li", { children: ["In Review: ", data?.inReview ?? 0] }), _jsxs("li", { children: ["Requires Docs: ", data?.requiresDocs ?? 0] }), _jsxs("li", { children: ["Sent to Lender: ", data?.sentToLender ?? 0] }), _jsxs("li", { children: ["Offers Received: ", data?.offersReceived ?? 0] }), _jsxs("li", { children: ["Closed: ", data?.closed ?? 0] }), _jsxs("li", { children: ["Declined: ", data?.declined ?? 0] })] })] }));
};
export default PipelineOverview;
