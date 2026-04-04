import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRetargetingRules, updateRetargetingRules } from "@/api/marketing.retargeting";
const RetargetingRules = () => {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ["retargeting-rules"], queryFn: fetchRetargetingRules });
    const mutation = useMutation({
        mutationFn: (rules) => updateRetargetingRules(rules),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retargeting-rules"] })
    });
    const toggleRule = (rule) => {
        if (!data)
            return;
        const updated = data.map((item) => (item.id === rule.id ? { ...item, enabled: !item.enabled } : item));
        mutation.mutate(updated);
    };
    return (_jsxs(Card, { title: "Retargeting Automation", children: [isLoading && _jsx(AppLoading, {}), !isLoading && (_jsx("ul", { className: "space-y-2", children: (data || []).map((rule) => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("div", { children: rule.description }), _jsx(Button, { variant: rule.enabled ? "primary" : "ghost", onClick: () => toggleRule(rule), children: rule.enabled ? "Enabled" : "Disabled" })] }, rule.id))) }))] }));
};
export default RetargetingRules;
