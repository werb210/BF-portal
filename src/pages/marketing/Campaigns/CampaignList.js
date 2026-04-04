import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "@/api/marketing.campaigns";
import CampaignEditor from "./CampaignEditor";
const CampaignList = () => {
    const { data, isLoading } = useQuery({ queryKey: ["campaigns"], queryFn: fetchCampaigns });
    const [selected, setSelected] = useState();
    const [editing, setEditing] = useState(false);
    return (_jsxs(Card, { title: "Campaigns", actions: _jsx(Button, { onClick: () => setEditing(true), children: "New campaign" }), children: [isLoading && _jsx(AppLoading, {}), !isLoading && (_jsx(Table, { headers: ["Name", "Platform", "Budget", "Spend", "Status", "Qualified", "Funded"], children: (data || []).map((campaign) => (_jsxs("tr", { children: [_jsx("td", { children: campaign.name }), _jsx("td", { children: campaign.platform }), _jsxs("td", { children: ["$", campaign.budget.toLocaleString()] }), _jsxs("td", { children: ["$", campaign.spend.toLocaleString()] }), _jsx("td", { className: "capitalize", children: campaign.status }), _jsx("td", { children: campaign.qualifiedApplications }), _jsx("td", { children: campaign.fundedDeals }), _jsx("td", { children: _jsx(Button, { variant: "ghost", onClick: () => setSelected(campaign), children: "Edit" }) })] }, campaign.id))) })), (editing || selected) && _jsx(CampaignEditor, { campaign: selected, onClose: () => { setSelected(undefined); setEditing(false); } })] }));
};
export default CampaignList;
