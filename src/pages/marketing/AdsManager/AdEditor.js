import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createAd, updateAd } from "@/api/marketing.ads";
import { useMutation, useQueryClient } from "@tanstack/react-query";
const AdEditor = ({ ad, onClose }) => {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        headline: "",
        body: "",
        budget: 0,
        campaign: "",
        platform: "Google",
        image: ""
    });
    useEffect(() => {
        if (ad) {
            setForm({
                headline: ad.headline,
                body: ad.body,
                budget: ad.budget,
                campaign: ad.campaign,
                platform: ad.platform,
                image: ad.image || ""
            });
        }
    }, [ad]);
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (ad) {
                return updateAd(ad.id, form);
            }
            return createAd(form);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ads"] });
            onClose();
        }
    });
    const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    return (_jsx("div", { className: "drawer", children: _jsx(Card, { title: ad ? "Edit ad" : "Create ad", actions: _jsx(Button, { onClick: onClose, children: "Close" }), children: _jsxs("div", { className: "grid gap-3", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Campaign" }), _jsx("input", { className: "input", value: form.campaign, onChange: (e) => updateField("campaign", e.target.value), placeholder: "Campaign name" })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Platform" }), _jsxs("select", { className: "input", value: form.platform, onChange: (e) => updateField("platform", e.target.value), children: [_jsx("option", { children: "Google" }), _jsx("option", { children: "Meta" }), _jsx("option", { children: "Twitter" }), _jsx("option", { children: "LinkedIn" })] })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Headline" }), _jsx("input", { className: "input", value: form.headline, onChange: (e) => updateField("headline", e.target.value) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Body" }), _jsx("textarea", { className: "input", value: form.body, onChange: (e) => updateField("body", e.target.value) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Budget" }), _jsx("input", { className: "input", type: "number", value: form.budget, onChange: (e) => updateField("budget", Number(e.target.value)) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Image URL" }), _jsx("input", { className: "input", value: form.image, onChange: (e) => updateField("image", e.target.value) })] }), _jsx(Button, { disabled: saveMutation.isPending, onClick: () => saveMutation.mutate(), children: "Save" })] }) }) }));
};
export default AdEditor;
