import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAudiences, createAudienceFromRule } from "@/api/marketing.retargeting";

const RetargetingAudienceList = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["retargeting-audiences"], queryFn: fetchAudiences });
  const mutation = useMutation({
    mutationFn: (ruleId: string) => createAudienceFromRule(ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retargeting-audiences"] })
  });

  return (
    <Card title="Retargeting Audiences">
      {isLoading && <AppLoading />}
      {!isLoading && (
        <div className="grid gap-3">
          <div className="flex gap-2">
            {["rule-1", "rule-2", "rule-3", "rule-4", "rule-5", "rule-6"].map((id) => (
              <Button key={id} variant="ghost" onClick={() => mutation.mutate(id)}>
                Generate from {id}
              </Button>
            ))}
          </div>
          <ul className="space-y-2">
            {(data || []).map((audience) => (
              <li key={audience.id} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{audience.name}</div>
                  <div className="text-muted text-sm">Size: {audience.size}</div>
                </div>
                <div className="text-xs text-muted">Source: {audience.sourceRuleId || "Manual"}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default RetargetingAudienceList;
