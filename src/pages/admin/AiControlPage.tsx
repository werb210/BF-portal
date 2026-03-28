import { useEffect, useMemo, useState } from "react";
import {
  createAdminAiRule,
  fetchAdminAiRules,
  type AdminAiRule,
  updateAdminAiRule
} from "@/api/adminAiRules";

export default function AiControlPage() {
  const [rules, setRules] = useState<AdminAiRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleContent, setNewRuleContent] = useState("");
  const [newRulePriority, setNewRulePriority] = useState(10);

  async function loadRules() {
    try {
      setLoading(true);
      const res = await fetchAdminAiRules();
      setRules(res);
      setError(null);
    } catch {
      setError("Unable to load AI rules.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRule() {
    if (!newRuleName.trim() || !newRuleContent.trim()) return;
    await createAdminAiRule({
      name: newRuleName.trim(),
      content: newRuleContent.trim(),
      active: true,
      priority: newRulePriority
    });

    setNewRuleName("");
    setNewRuleContent("");
    setNewRulePriority(10);
    await loadRules();
  }

  async function updateRule(ruleId: string, patch: Partial<Omit<AdminAiRule, "id">>) {
    await updateAdminAiRule(ruleId, patch);
    await loadRules();
  }

  const sortedRules = useMemo(() => [...rules].sort((a, b) => a.priority - b.priority), [rules]);

  if (loading) return <div>Loading AI rules...</div>;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">AI System Rules</h1>
      {error ? <div className="mb-3 text-sm text-red-700">{error}</div> : null}

      <div className="mb-6 space-y-3">
        {sortedRules.map((rule) => (
          <div key={rule.id} className="rounded border p-3">
            <div className="grid gap-2 md:grid-cols-6">
              <input
                className="border p-2 md:col-span-2"
                value={rule.name}
                onChange={(event) => {
                  const updated = rules.map((item) => (item.id === rule.id ? { ...item, name: event.target.value } : item));
                  setRules(updated);
                }}
              />
              <input
                type="number"
                className="border p-2"
                value={rule.priority}
                onChange={(event) => {
                  const updated = rules.map((item) =>
                    item.id === rule.id ? { ...item, priority: Number(event.target.value) || item.priority } : item
                  );
                  setRules(updated);
                }}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(event) => {
                    const updated = rules.map((item) => (item.id === rule.id ? { ...item, active: event.target.checked } : item));
                    setRules(updated);
                  }}
                />
                Active
              </label>
              <button
                onClick={() =>
                  void updateRule(rule.id, {
                    name: rule.name,
                    content: rule.content,
                    active: rule.active,
                    priority: rule.priority
                  })
                }
                className="rounded bg-blue-600 px-3 py-1 text-white"
              >
                Save
              </button>
            </div>
            <textarea
              value={rule.content}
              onChange={(event) => {
                const updated = rules.map((item) => (item.id === rule.id ? { ...item, content: event.target.value } : item));
                setRules(updated);
              }}
              className="mt-2 w-full border p-2"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded border p-4">
        <input
          value={newRuleName}
          onChange={(e) => setNewRuleName(e.target.value)}
          placeholder="Rule Name"
          className="w-full border p-2"
        />
        <textarea
          value={newRuleContent}
          onChange={(e) => setNewRuleContent(e.target.value)}
          placeholder="Rule Content"
          className="w-full border p-2"
        />
        <input
          type="number"
          value={newRulePriority}
          onChange={(event) => setNewRulePriority(Number(event.target.value) || 10)}
          placeholder="Priority"
          className="w-full border p-2"
        />
        <button onClick={() => void saveRule()} className="rounded bg-black px-4 py-2 text-white">
          Create Rule
        </button>
      </div>
    </div>
  );
}
