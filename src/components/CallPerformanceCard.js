import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { apiCall } from "@/lib/api";
export default function CallPerformanceCard() {
    const [stats, setStats] = useState({
        totalCalls: 0,
        answered: 0,
        missed: 0,
        avgDuration: 0,
    });
    useEffect(() => {
        async function load() {
            try {
                const data = await apiCall("/api/v1/metrics");
                setStats({
                    totalCalls: data.totalCalls || 0,
                    answered: data.answered || 0,
                    missed: data.missed || 0,
                    avgDuration: data.avgDuration || 0,
                });
            }
            catch (err) {
                console.error(err);
                setStats({
                    totalCalls: 0,
                    answered: 0,
                    missed: 0,
                    avgDuration: 0,
                });
            }
        }
        load();
    }, []);
    return (_jsxs("div", { children: [_jsx("h3", { children: "Call Performance" }), _jsxs("div", { children: ["Total: ", stats.totalCalls] }), _jsxs("div", { children: ["Answered: ", stats.answered] }), _jsxs("div", { children: ["Missed: ", stats.missed] }), _jsxs("div", { children: ["Avg Duration: ", stats.avgDuration] })] }));
}
