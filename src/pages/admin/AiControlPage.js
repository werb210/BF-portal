import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { createAdminAiRule, fetchAdminAiRules, updateAdminAiRule } from "@/api/adminAiRules";
export default function AiControlPage() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newRuleName, setNewRuleName] = useState("");
    const [newRuleContent, setNewRuleContent] = useState("");
    const [newRulePriority, setNewRulePriority] = useState(10);
    async function loadRules() {
        try {
            setLoading(true);
            const res = await fetchAdminAiRules();
            setRules(res);
            setError(null);
        }
        catch {
            setError("Unable to load AI rules.");
        }
        finally {
            setLoading(false);
        }
    }
    async function saveRule() {
        if (!newRuleName.trim() || !newRuleContent.trim())
            return;
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
    async function updateRule(ruleId, patch) {
        await updateAdminAiRule(ruleId, patch);
        await loadRules();
    }
    const sortedRules = useMemo(() => [...rules].sort((a, b) => a.priority - b.priority), [rules]);
    if (loading)
        return _jsx("div", { children: "Loading AI rules..." });
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "mb-4 text-xl font-semibold", children: "AI System Rules" }), error ? _jsx("div", { className: "mb-3 text-sm text-red-700", children: error }) : null, _jsx("div", { className: "mb-6 space-y-3", children: sortedRules.map((rule) => (_jsxs("div", { className: "rounded border p-3", children: [_jsxs("div", { className: "grid gap-2 md:grid-cols-6", children: [_jsx("input", { className: "border p-2 md:col-span-2", value: rule.name, onChange: (event) => {
                                        const updated = rules.map((item) => (item.id === rule.id ? { ...item, name: event.target.value } : item));
                                        setRules(updated);
                                    } }), _jsx("input", { type: "number", className: "border p-2", value: rule.priority, onChange: (event) => {
                                        const updated = rules.map((item) => item.id === rule.id ? { ...item, priority: Number(event.target.value) || item.priority } : item);
                                        setRules(updated);
                                    } }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: rule.active, onChange: (event) => {
                                                const updated = rules.map((item) => (item.id === rule.id ? { ...item, active: event.target.checked } : item));
                                                setRules(updated);
                                            } }), "Active"] }), _jsx("button", { onClick: () => void updateRule(rule.id, {
                                        name: rule.name,
                                        content: rule.content,
                                        active: rule.active,
                                        priority: rule.priority
                                    }), className: "rounded bg-blue-600 px-3 py-1 text-white", children: "Save" })] }), _jsx("textarea", { value: rule.content, onChange: (event) => {
                                const updated = rules.map((item) => (item.id === rule.id ? { ...item, content: event.target.value } : item));
                                setRules(updated);
                            }, className: "mt-2 w-full border p-2" })] }, rule.id))) }), _jsxs("div", { className: "space-y-2 rounded border p-4", children: [_jsx("input", { value: newRuleName, onChange: (e) => setNewRuleName(e.target.value), placeholder: "Rule Name", className: "w-full border p-2" }), _jsx("textarea", { value: newRuleContent, onChange: (e) => setNewRuleContent(e.target.value), placeholder: "Rule Content", className: "w-full border p-2" }), _jsx("input", { type: "number", value: newRulePriority, onChange: (event) => setNewRulePriority(Number(event.target.value) || 10), placeholder: "Priority", className: "w-full border p-2" }), _jsx("button", { onClick: () => void saveRule(), className: "rounded bg-black px-4 py-2 text-white", children: "Create Rule" })] })] }));
}
