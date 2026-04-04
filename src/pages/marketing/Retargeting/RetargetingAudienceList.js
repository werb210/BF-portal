import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAudiences, createAudienceFromRule } from "@/api/marketing.retargeting";
const RetargetingAudienceList = () => {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ["retargeting-audiences"], queryFn: fetchAudiences });
    const mutation = useMutation({
        mutationFn: (ruleId) => createAudienceFromRule(ruleId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retargeting-audiences"] })
    });
    return (_jsxs(Card, { title: "Retargeting Audiences", children: [isLoading && _jsx(AppLoading, {}), !isLoading && (_jsxs("div", { className: "grid gap-3", children: [_jsx("div", { className: "flex gap-2", children: ["rule-1", "rule-2", "rule-3", "rule-4", "rule-5", "rule-6"].map((id) => (_jsxs(Button, { variant: "ghost", onClick: () => mutation.mutate(id), children: ["Generate from ", id] }, id))) }), _jsx("ul", { className: "space-y-2", children: (data || []).map((audience) => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: audience.name }), _jsxs("div", { className: "text-muted text-sm", children: ["Size: ", audience.size] })] }), _jsxs("div", { className: "text-xs text-muted", children: ["Source: ", audience.sourceRuleId || "Manual"] })] }, audience.id))) })] }))] }));
};
export default RetargetingAudienceList;
