import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";
const OfferFeed = () => {
    const enableDashboardQueries = process.env.NODE_ENV !== "test";
    const { data, isLoading } = useQuery({ queryKey: ["dashboard", "offers"], queryFn: dashboardApi.getOffers, enabled: enableDashboardQueries });
    return (_jsxs(Card, { title: "Offer Activity", children: [isLoading ? _jsx("p", { children: "Loading\u2026" }) : null, _jsxs("ul", { className: "space-y-1 text-sm", children: [_jsxs("li", { children: ["New offers: ", data?.newOffers ?? 0] }), _jsxs("li", { children: ["Accepted offers: ", data?.acceptedOffers ?? 0] }), _jsxs("li", { children: ["Expiring offers: ", data?.expiringOffers ?? 0] })] })] }));
};
export default OfferFeed;
