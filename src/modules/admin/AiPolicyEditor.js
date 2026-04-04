import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function AiPolicyEditor() {
    const [rules, setRules] = useState([]);
    useEffect(() => {
        api("/api/ai/policy")
            .then(setRules)
            .catch(() => setRules([]));
    }, []);
    async function save(rule) {
        await api("/api/ai/policy", {
            method: "POST",
            body: rule
        });
    }
    function updateRule(id, patch) {
        setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "mb-4 text-xl font-semibold", children: "AI Policy Rules" }), rules.map((r) => (_jsxs("div", { className: "mb-4 rounded border p-3", children: [_jsx("textarea", { value: r.content, onChange: (e) => updateRule(r.id, { content: e.target.value }), className: "w-full border p-2" }), _jsxs("label", { className: "mt-2 flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(r.active), onChange: (e) => updateRule(r.id, { active: e.target.checked }) }), "Active"] }), _jsx("button", { onClick: () => save(r), className: "mt-2 rounded bg-blue-600 px-3 py-1 text-white", children: "Save" })] }, r.id)))] }));
}
