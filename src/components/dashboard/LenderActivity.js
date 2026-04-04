import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";
const LenderActivity = () => {
    const enableDashboardQueries = process.env.NODE_ENV !== "test";
    const { data, isLoading } = useQuery({ queryKey: ["dashboard", "lender-activity"], queryFn: dashboardApi.getLenderActivity, enabled: enableDashboardQueries });
    return (_jsxs(Card, { title: "Lender Submissions", children: [isLoading ? _jsx("p", { children: "Loading\u2026" }) : null, _jsxs("ul", { className: "space-y-1 text-sm", children: [_jsxs("li", { children: ["Recent submissions: ", data?.recentSubmissions ?? 0] }), _jsxs("li", { children: ["Awaiting lender response: ", data?.awaitingLenderResponse ?? 0] }), _jsxs("li", { children: ["Declined submissions: ", data?.declinedSubmissions ?? 0] })] })] }));
};
export default LenderActivity;
