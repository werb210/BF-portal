import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertCampaign } from "@/api/marketing.campaigns";
const CampaignEditor = ({ campaign, onClose }) => {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ platform: "Google" });
    useEffect(() => {
        if (campaign)
            setForm(campaign);
    }, [campaign]);
    const saveMutation = useMutation({
        mutationFn: () => upsertCampaign(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            onClose();
        }
    });
    const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    return (_jsx("div", { className: "drawer", children: _jsx(Card, { title: campaign ? "Edit campaign" : "Create campaign", actions: _jsx(Button, { onClick: onClose, children: "Close" }), children: _jsxs("div", { className: "grid gap-2", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Name" }), _jsx("input", { className: "input", value: form.name || "", onChange: (e) => updateField("name", e.target.value) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Platform" }), _jsxs("select", { className: "input", value: form.platform, onChange: (e) => updateField("platform", e.target.value), children: [_jsx("option", { children: "Google" }), _jsx("option", { children: "Meta" }), _jsx("option", { children: "Twitter" }), _jsx("option", { children: "LinkedIn" })] })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Budget" }), _jsx("input", { type: "number", className: "input", value: form.budget || 0, onChange: (e) => updateField("budget", Number(e.target.value)) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Status" }), _jsxs("select", { className: "input", value: form.status, onChange: (e) => updateField("status", e.target.value), children: [_jsx("option", { value: "draft", children: "Draft" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "paused", children: "Paused" })] })] }), _jsx(Button, { disabled: saveMutation.isPending, onClick: () => saveMutation.mutate(), children: "Save" })] }) }) }));
};
export default CampaignEditor;
