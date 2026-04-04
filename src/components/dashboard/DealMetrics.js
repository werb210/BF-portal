import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";
const DealMetrics = () => {
    const enableDashboardQueries = process.env.NODE_ENV !== "test";
    const { data, isLoading } = useQuery({ queryKey: ["dashboard", "metrics"], queryFn: dashboardApi.getMetrics, enabled: enableDashboardQueries });
    return (_jsxs(Card, { title: "Deal Metrics", children: [isLoading ? _jsx("p", { children: "Loading\u2026" }) : null, _jsxs("ul", { className: "space-y-1 text-sm", children: [_jsxs("li", { children: ["Average deal size: $", Math.round(data?.averageDealSize ?? 0).toLocaleString()] }), _jsxs("li", { children: ["Approval rate: ", Number(data?.approvalRate ?? 0).toFixed(1), "%"] }), _jsxs("li", { children: ["Average approval time: ", Number(data?.averageApprovalTimeDays ?? 0).toFixed(1), " days"] }), _jsxs("li", { children: ["Lender response time: ", Number(data?.lenderResponseTimeDays ?? 0).toFixed(1), " days"] })] })] }));
};
export default DealMetrics;
