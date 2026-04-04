import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function CampaignRevenue() {
    const [data, setData] = useState([]);
    useEffect(() => {
        api("/analytics/campaign-revenue")
            .then(setData)
            .catch((err) => console.error(err));
    }, []);
    return (_jsx("div", { className: "grid gap-3", children: data.map((campaign) => (_jsxs("div", { className: "rounded border border-slate-200 p-3", children: [_jsx("h4", { className: "font-semibold", children: campaign.utm_campaign }), _jsxs("p", { children: ["Funded: $", campaign.fundedAmount] }), _jsxs("p", { children: ["Commission: $", campaign.commission] })] }, campaign.utm_campaign))) }));
}
