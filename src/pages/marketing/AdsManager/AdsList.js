import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAds, toggleAdStatus } from "@/api/marketing.ads";
import { useMarketingStore } from "@/state/marketing.store";
import AdDetailsDrawer from "./AdDetailsDrawer";
import AdEditor from "./AdEditor";
const AdsList = () => {
    const { platformFilter } = useMarketingStore();
    const queryClient = useQueryClient();
    const { data: ads, isLoading } = useQuery({ queryKey: ["ads"], queryFn: fetchAds });
    const [selected, setSelected] = useState();
    const [editing, setEditing] = useState(false);
    const toggleMutation = useMutation({
        mutationFn: (id) => toggleAdStatus(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ads"] })
    });
    const filteredAds = (ads || []).filter((ad) => platformFilter === "All" || !platformFilter || ad.platform === platformFilter);
    return (_jsxs(Card, { title: "Ads Manager", actions: _jsx(Button, { onClick: () => setEditing(true), children: "New ad" }), children: [isLoading && _jsx(AppLoading, {}), !isLoading && (_jsxs(Table, { headers: ["Platform", "Campaign", "Headline", "Spend", "Clicks", "Conv.", "Status", "Actions"], children: [filteredAds.map((ad) => (_jsxs("tr", { children: [_jsx("td", { children: ad.platform }), _jsx("td", { children: ad.campaign }), _jsx("td", { children: ad.headline }), _jsxs("td", { children: ["$", ad.spend.toLocaleString()] }), _jsx("td", { children: ad.clicks.toLocaleString() }), _jsx("td", { children: ad.conversions.toLocaleString() }), _jsx("td", { className: "capitalize", children: ad.status }), _jsxs("td", { className: "space-x-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setSelected(ad), children: "Details" }), _jsx(Button, { variant: "ghost", onClick: () => setEditing(true), children: "Edit" }), _jsx(Button, { variant: "ghost", disabled: toggleMutation.isPending, onClick: () => toggleMutation.mutate(ad.id), children: ad.status === "active" ? "Pause" : "Activate" })] })] }, ad.id))), !filteredAds.length && (_jsx("tr", { children: _jsx("td", { colSpan: 8, children: "No ads found." }) }))] })), selected && _jsx(AdDetailsDrawer, { ad: selected, onClose: () => setSelected(undefined) }), editing && _jsx(AdEditor, { ad: selected, onClose: () => setEditing(false) })] }));
};
export default AdsList;
