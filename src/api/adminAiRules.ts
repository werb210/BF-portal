import apiClient from "@/api/httpClient";

export type AdminAiRule = {
  id: string;
  name: string;
  content: string;
  active: boolean;
  priority: number;
};

let fallbackRules: AdminAiRule[] = [
  { id: "rule-1", name: "Escalate billing issues", content: "Escalate payment disputes to staff.", active: true, priority: 1 },
  { id: "rule-2", name: "Avoid policy hallucination", content: "Never invent policy details.", active: true, priority: 2 }
];

const withDelay = async <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 5));

export async function fetchAdminAiRules(): Promise<AdminAiRule[]> {
  try {
    return await apiClient.get<AdminAiRule[]>("/admin/ai-rules");
  } catch {
    return withDelay([...fallbackRules].sort((a, b) => a.priority - b.priority));
  }
}

export async function createAdminAiRule(payload: Omit<AdminAiRule, "id">): Promise<AdminAiRule> {
  try {
    return await apiClient.post<AdminAiRule>("/admin/ai-rules", payload);
  } catch {
    const created = { ...payload, id: `rule-${Date.now()}` };
    fallbackRules = [...fallbackRules, created];
    return withDelay(created);
  }
}

export async function updateAdminAiRule(ruleId: string, payload: Partial<Omit<AdminAiRule, "id">>): Promise<AdminAiRule> {
  try {
    return await apiClient.patch<AdminAiRule>(`/admin/ai-rules/${ruleId}`, payload);
  } catch {
    const current = fallbackRules.find((rule) => rule.id === ruleId);
    if (!current) {
      throw new Error("Rule not found");
    }
    const updated = { ...current, ...payload };
    fallbackRules = fallbackRules.map((rule) => (rule.id === ruleId ? updated : rule));
    return withDelay(updated);
  }
}
