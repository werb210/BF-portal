import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEmailCampaigns, sendBulkEmail } from "@/api/bulkMessaging";
import AudienceSelector from "./AudienceSelector";
const BulkEmailComposer = () => {
    const queryClient = useQueryClient();
    const { data: campaigns } = useQuery({ queryKey: ["bulk-email"], queryFn: fetchEmailCampaigns });
    const [form, setForm] = useState({
        subject: "",
        body: "",
        audience: {},
        template: ""
    });
    const sendMutation = useMutation({
        mutationFn: () => sendBulkEmail(form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bulk-email"] })
    });
    return (_jsx(Card, { title: "Bulk Email", actions: _jsx(Button, { disabled: sendMutation.isPending, onClick: () => sendMutation.mutate(), children: "Submit" }), children: _jsxs("div", { className: "grid gap-3", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Subject" }), _jsx("input", { className: "input", value: form.subject, onChange: (e) => setForm({ ...form, subject: e.target.value }) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Template" }), _jsx("input", { className: "input", value: form.template || "", onChange: (e) => setForm({ ...form, template: e.target.value }) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Body" }), _jsx("textarea", { className: "input", value: form.body, onChange: (e) => setForm({ ...form, body: e.target.value }) })] }), _jsx(AudienceSelector, { value: form.audience, onChange: (audience) => setForm({ ...form, audience }) }), _jsxs("div", { children: [_jsx("div", { className: "text-muted mb-2", children: "Recent sends" }), _jsx("ul", { className: "space-y-1", children: (campaigns || []).map((campaign) => (_jsxs("li", { className: "text-sm", children: [campaign.subject, " \u2014 Delivered ", campaign.metrics.delivered, " \u2022 Opens ", campaign.metrics.opens, " \u2022 Clicks ", campaign.metrics.clicks] }, campaign.id))) })] })] }) }));
};
export default BulkEmailComposer;
