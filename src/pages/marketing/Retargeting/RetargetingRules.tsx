import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRetargetingRules, updateRetargetingRules, type RetargetingRule } from "@/api/marketing.retargeting";

const RetargetingRules = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["retargeting-rules"], queryFn: fetchRetargetingRules });
  const mutation = useMutation({
    mutationFn: (rules: RetargetingRule[]) => updateRetargetingRules(rules),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retargeting-rules"] })
  });

  const toggleRule = (rule: RetargetingRule) => {
    if (!data) return;
    const updated = data.map((item) => (item.id === rule.id ? { ...item, enabled: !item.enabled } : item));
    mutation.mutate(updated);
  };

  return (
    <Card title="Retargeting Automation">
      {isLoading && <AppLoading />}
      {!isLoading && (
        <ul className="space-y-2">
          {(data || []).map((rule) => (
            <li key={rule.id} className="flex items-center justify-between">
              <div>{rule.description}</div>
              <Button variant={rule.enabled ? "primary" : "ghost"} onClick={() => toggleRule(rule)}>
                {rule.enabled ? "Enabled" : "Disabled"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default RetargetingRules;
