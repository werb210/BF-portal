import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

type PolicyRule = {
  id: string;
  content: string;
  active?: boolean;
};

export default function AiPolicyEditor() {
  const [rules, setRules] = useState<PolicyRule[]>([]);

  useEffect(() => {
    apiClient<PolicyRule[]>("/api/ai/policy")
      .then(setRules)
      .catch(() => setRules([]));
  }, []);

  async function save(rule: PolicyRule) {
    await apiClient("/api/ai/policy", {
      method: "POST",
      data: rule
    });
  }

  function updateRule(id: string, patch: Partial<PolicyRule>) {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold">AI Policy Rules</h2>

      {rules.map((r) => (
        <div key={r.id} className="mb-4 rounded border p-3">
          <textarea
            value={r.content}
            onChange={(e) => updateRule(r.id, { content: e.target.value })}
            className="w-full border p-2"
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(r.active)}
              onChange={(e) => updateRule(r.id, { active: e.target.checked })}
            />
            Active
          </label>
          <button onClick={() => save(r)} className="mt-2 rounded bg-blue-600 px-3 py-1 text-white">
            Save
          </button>
        </div>
      ))}
    </div>
  );
}
