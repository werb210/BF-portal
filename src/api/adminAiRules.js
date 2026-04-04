import api from "@/api";
let fallbackRules = [
    { id: "rule-1", name: "Escalate billing issues", content: "Escalate payment disputes to staff.", active: true, priority: 1 },
    { id: "rule-2", name: "Avoid policy hallucination", content: "Never invent policy details.", active: true, priority: 2 }
];
const withDelay = async (value) => new Promise((resolve) => setTimeout(() => resolve(value), 5));
export async function fetchAdminAiRules() {
    try {
        return await api.get("/admin/ai-rules");
    }
    catch {
        return withDelay([...fallbackRules].sort((a, b) => a.priority - b.priority));
    }
}
export async function createAdminAiRule(payload) {
    try {
        return await api.post("/admin/ai-rules", payload);
    }
    catch {
        const created = { ...payload, id: `rule-${Date.now()}` };
        fallbackRules = [...fallbackRules, created];
        return withDelay(created);
    }
}
export async function updateAdminAiRule(ruleId, payload) {
    try {
        return await api.patch(`/admin/ai-rules/${ruleId}`, payload);
    }
    catch {
        const current = fallbackRules.find((rule) => rule.id === ruleId);
        if (!current) {
            return withDelay({ id: ruleId, name: "", content: "", active: false, priority: 0, ...payload });
        }
        const updated = { ...current, ...payload };
        fallbackRules = fallbackRules.map((rule) => (rule.id === ruleId ? updated : rule));
        return withDelay(updated);
    }
}
