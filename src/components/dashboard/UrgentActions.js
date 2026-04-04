import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";
const UrgentActions = () => {
    const enableDashboardQueries = process.env.NODE_ENV !== "test";
    const { data, isLoading } = useQuery({ queryKey: ["dashboard", "actions"], queryFn: dashboardApi.getActions, enabled: enableDashboardQueries });
    return (_jsxs(Card, { title: "Urgent Actions", children: [isLoading ? _jsx("p", { children: "Loading\u2026" }) : null, _jsxs("ul", { className: "space-y-1 text-sm", children: [_jsxs("li", { children: ["Waiting >24h: ", data?.waitingOver24h ?? 0] }), _jsxs("li", { children: ["Missing documents: ", data?.missingDocuments ?? 0] }), _jsxs("li", { children: ["Offers expiring: ", data?.offersExpiring ?? 0] }), _jsxs("li", { children: ["Clients awaiting response: ", data?.awaitingClientResponse ?? 0] })] })] }));
};
export default UrgentActions;
