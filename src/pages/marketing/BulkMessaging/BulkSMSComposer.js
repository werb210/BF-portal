import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSmsCampaigns, sendBulkSms } from "@/api/bulkMessaging";
import AudienceSelector from "./AudienceSelector";
const BulkSMSComposer = () => {
    const queryClient = useQueryClient();
    const { data: campaigns } = useQuery({ queryKey: ["bulk-sms"], queryFn: fetchSmsCampaigns });
    const [form, setForm] = useState({
        body: "",
        audience: {}
    });
    const chars = form.body.length;
    const parts = Math.max(1, Math.ceil(chars / 160));
    const sendMutation = useMutation({
        mutationFn: () => sendBulkSms(form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bulk-sms"] })
    });
    return (_jsx(Card, { title: "Bulk SMS", actions: _jsx(Button, { disabled: sendMutation.isPending || !form.body, onClick: () => sendMutation.mutate(), children: "Submit" }), children: _jsxs("div", { className: "grid gap-3", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Message" }), _jsx("textarea", { className: "input", value: form.body, onChange: (e) => setForm({ ...form, body: e.target.value }) }), _jsxs("div", { className: "text-xs text-muted", children: [chars, " characters \u2022 ", parts, " part SMS"] })] }), _jsx(AudienceSelector, { value: form.audience, onChange: (audience) => setForm({ ...form, audience }) }), _jsxs("div", { children: [_jsx("div", { className: "text-muted mb-2", children: "Recent sends" }), _jsx("ul", { className: "space-y-1", children: (campaigns || []).map((sms) => (_jsxs("li", { className: "text-sm", children: [sms.body.slice(0, 60), "... \u2014 Delivered ", sms.metrics.delivered, " \u2022 Failed ", sms.metrics.failed, " \u2022 Replies ", sms.metrics.replies] }, sms.id))) })] })] }) }));
};
export default BulkSMSComposer;
