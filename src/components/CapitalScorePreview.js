import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { api } from "@/api";
export default function CapitalScorePreview() {
    const [score, setScore] = useState(null);
    async function testScore() {
        const data = await api("/scoring", {
            method: "POST",
            body: {
                revenue: 200000,
                timeInBusiness: 36,
                creditScore: 700,
            },
        });
        setScore(data);
    }
    return (_jsxs("div", { className: "space-y-3 rounded-lg border border-slate-200 bg-white p-4", children: [_jsx("button", { type: "button", onClick: testScore, className: "rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100", children: "Test Scoring" }), score && (_jsxs("div", { children: [_jsxs("p", { children: ["Score: ", score.score] }), _jsxs("p", { children: ["Rating: ", score.rating] })] }))] }));
}
