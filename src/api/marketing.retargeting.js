let rules = [
    { id: "rule-1", description: "Viewed Step 1 → didn’t start", enabled: true },
    { id: "rule-2", description: "Started application → didn’t finish", enabled: true },
    { id: "rule-3", description: "Finished application → no docs uploaded", enabled: false },
    { id: "rule-4", description: "Docs rejected", enabled: true },
    { id: "rule-5", description: "Declined by lender", enabled: false },
    { id: "rule-6", description: "Approved but no contact from client", enabled: true }
];
let audiences = [
    { id: "aud-1", name: "Half-finished applications", size: 420, sourceRuleId: "rule-2" },
    { id: "aud-2", name: "Docs rejected", size: 180, sourceRuleId: "rule-4" },
    { id: "aud-3", name: "Approved, no contact", size: 95, sourceRuleId: "rule-6" }
];
const withDelay = async (data) => new Promise((resolve) => setTimeout(() => resolve(data), 90));
export const fetchRetargetingRules = async () => withDelay(rules);
export const updateRetargetingRules = async (updated) => {
    rules = updated;
    return withDelay(rules);
};
export const fetchAudiences = async () => withDelay(audiences);
export const createAudienceFromRule = async (ruleId) => {
    const baseRule = rules.find((rule) => rule.id === ruleId);
    const newAudience = {
        id: `aud-${audiences.length + 1}`,
        name: baseRule ? `${baseRule.description} audience` : "Manual audience",
        size: Math.floor(Math.random() * 250) + 50,
        sourceRuleId: ruleId
    };
    audiences = [newAudience, ...audiences];
    return withDelay(newAudience);
};
