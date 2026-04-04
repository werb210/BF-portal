import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "@/api/marketing.campaigns";
const CampaignAnalytics = () => {
    const { data, isLoading } = useQuery({ queryKey: ["campaign-analytics"], queryFn: fetchCampaigns });
    const totals = (data || []).reduce((acc, item) => {
        acc.spend += item.spend;
        acc.conversions += item.conversions;
        acc.funded += item.fundedDeals;
        return acc;
    }, { spend: 0, conversions: 0, funded: 0 });
    return (_jsxs(Card, { title: "Campaign Analytics", children: [isLoading && _jsx(AppLoading, {}), !isLoading && (_jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "text-muted", children: "Total spend" }), _jsxs("div", { className: "text-2xl", children: ["$", totals.spend.toLocaleString()] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "text-muted", children: "Total conversions" }), _jsx("div", { className: "text-2xl", children: totals.conversions })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "text-muted", children: "Funded deals" }), _jsx("div", { className: "text-2xl", children: totals.funded })] })] }), _jsx(Table, { headers: ["Campaign", "Platform", "Conversions", "Avg Funding"], children: (data || []).map((camp) => (_jsxs("tr", { children: [_jsx("td", { children: camp.name }), _jsx("td", { children: camp.platform }), _jsx("td", { children: camp.conversions }), _jsxs("td", { children: ["$", camp.averageFunding.toLocaleString()] })] }, camp.id))) })] }))] }));
};
export default CampaignAnalytics;
