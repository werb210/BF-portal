export type RetargetingRule = {
  id: string;
  description: string;
  enabled: boolean;
};

export type Audience = {
  id: string;
  name: string;
  size: number;
  sourceRuleId?: string;
};

let rules: RetargetingRule[] = [
  { id: "rule-1", description: "Viewed Step 1 → didn’t start", enabled: true },
  { id: "rule-2", description: "Started application → didn’t finish", enabled: true },
  { id: "rule-3", description: "Finished application → no docs uploaded", enabled: false },
  { id: "rule-4", description: "Docs rejected", enabled: true },
  { id: "rule-5", description: "Declined by lender", enabled: false },
  { id: "rule-6", description: "Approved but no contact from client", enabled: true }
];

let audiences: Audience[] = [
  { id: "aud-1", name: "Half-finished applications", size: 420, sourceRuleId: "rule-2" },
  { id: "aud-2", name: "Docs rejected", size: 180, sourceRuleId: "rule-4" },
  { id: "aud-3", name: "Approved, no contact", size: 95, sourceRuleId: "rule-6" }
];

const withDelay = async <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 90));

export const fetchRetargetingRules = async (): Promise<RetargetingRule[]> => withDelay(rules);

export const updateRetargetingRules = async (updated: RetargetingRule[]): Promise<RetargetingRule[]> => {
  rules = updated;
  return withDelay(rules);
};

export const fetchAudiences = async (): Promise<Audience[]> => withDelay(audiences);

export const createAudienceFromRule = async (ruleId: string): Promise<Audience> => {
  const baseRule = rules.find((rule) => rule.id === ruleId);
  const newAudience: Audience = {
    id: `aud-${audiences.length + 1}`,
    name: baseRule ? `${baseRule.description} audience` : "Manual audience",
    size: Math.floor(Math.random() * 250) + 50,
    sourceRuleId: ruleId
  };
  audiences = [newAudience, ...audiences];
  return withDelay(newAudience);
};
