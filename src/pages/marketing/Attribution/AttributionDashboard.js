import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import { useMarketingStore } from "@/state/marketing.store";
const AttributionDashboard = ({ data, loading }) => {
    const { dateRange, setDateRange } = useMarketingStore();
    return (_jsxs(Card, { title: "Attribution Dashboard", actions: _jsxs("select", { className: "input", value: dateRange, onChange: (e) => setDateRange(e.target.value), children: [_jsx("option", { children: "Last 7 days" }), _jsx("option", { children: "Last 30 days" }), _jsx("option", { children: "Last 90 days" })] }), children: [loading && _jsx(AppLoading, {}), !loading && data && (_jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "text-muted", children: "Primary channels" }), _jsx("ul", { className: "list-disc pl-5 space-y-1", children: data.distribution.map((item) => (_jsxs("li", { children: [item.channel, ": ", item.value, "%"] }, item.channel))) })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "text-muted", children: "Date range" }), _jsx("div", { className: "text-lg", children: data.dateRange })] })] }), _jsx(Table, { headers: [
                            "Channel",
                            "Leads",
                            "Qualified",
                            "Funded",
                            "CPL",
                            "CPQA",
                            "CPF",
                            "Avg Funding",
                            "Funnel",
                            "Lender preference"
                        ], children: data.channels.map((channel) => (_jsxs("tr", { children: [_jsx("td", { children: channel.channel }), _jsx("td", { children: channel.leads }), _jsx("td", { children: channel.qualifiedApplications }), _jsx("td", { children: channel.fundedDeals }), _jsxs("td", { children: ["$", channel.costPerLead.toFixed(2)] }), _jsxs("td", { children: ["$", channel.costPerQualifiedApp.toFixed(2)] }), _jsxs("td", { children: ["$", channel.costPerFundedDeal.toFixed(2)] }), _jsxs("td", { children: ["$", channel.averageFunding.toLocaleString()] }), _jsxs("td", { children: [(channel.funnelConversion * 100).toFixed(1), "%"] }), _jsx("td", { children: channel.lenderPreference })] }, channel.channel))) })] }))] }));
};
export default AttributionDashboard;
