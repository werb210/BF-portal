import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from "recharts";
import api from "@/api";
const COLORS = ["#4f46e5", "#16a34a", "#dc2626", "#f59e0b"];
export default function MayaIntelligence() {
    const [data, setData] = useState(null);
    const [roiInput, setRoiInput] = useState(10000);
    const [roiProjection, setRoiProjection] = useState(null);
    useEffect(() => {
        api.get("/api/maya/overview")
            .then((res) => {
            setData((res ?? null));
        })
            .catch(() => setData(null));
    }, []);
    async function simulateROI() {
        const res = await api.post("/api/maya/roi-simulate", { budget: roiInput });
        if (res && typeof res === "object" && "projectedRevenue" in res) {
            setRoiProjection(Number(res.projectedRevenue ?? 0));
        }
    }
    async function rollbackModel(version) {
        await api.post("/api/maya/model-rollback", { version });
        throw new Error("Model rolled back.");
    }
    if (!data)
        return _jsx("div", { children: "Loading Maya Intelligence..." });
    return (_jsxs("div", { className: "p-6 space-y-14", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Maya Executive Intelligence" }), data.clusterDistribution?.length ? (_jsxs(Card, { children: [_jsx("h2", { className: "font-semibold mb-2", children: "Cluster Distribution" }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data.clusterDistribution, dataKey: "count", nameKey: "label", outerRadius: 100, children: data.clusterDistribution.map((_, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, index))) }), _jsx(Tooltip, {})] }) })] })) : null, data.fundingHeatmap && (_jsxs(Card, { children: [_jsx("h2", { className: "font-semibold mb-2", children: "Funding Probability Heatmap" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: data.fundingHeatmap, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "riskBand" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "probability", fill: "#4f46e5" })] }) })] })), data.confidenceTrend && (_jsxs(Card, { children: [_jsx("h2", { className: "font-semibold mb-2", children: "Confidence Trend" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: data.confidenceTrend, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "date" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Line, { type: "monotone", dataKey: "confidence", stroke: "#4f46e5", strokeWidth: 2 })] }) })] })), _jsxs(Card, { children: [_jsx("h2", { className: "font-semibold mb-2", children: "ROI Forecast Simulator" }), _jsx("input", { type: "number", value: roiInput, onChange: (e) => setRoiInput(Number(e.target.value)), className: "border p-2" }), _jsx(Button, { className: "ml-3", onClick: simulateROI, children: "Simulate" }), roiProjection && (_jsxs("p", { className: "mt-2", children: ["Projected Revenue: $", roiProjection.toLocaleString()] }))] }), data.staffPerformance && (_jsxs(Card, { children: [_jsx("h2", { className: "font-semibold mb-2", children: "Staff Performance Correlation" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: data.staffPerformance, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "staff" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "closeRate", fill: "#16a34a" })] }) })] })), data.modelVersions && (_jsxs(Card, { children: [_jsx("h2", { className: "font-semibold mb-2", children: "ML Model Versions" }), _jsxs("table", { className: "w-full border", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Version" }), _jsx("th", { children: "Accuracy" }), _jsx("th", { children: "Date" }), _jsx("th", { children: "Action" })] }) }), _jsx("tbody", { children: data.modelVersions.map((v, i) => (_jsxs("tr", { children: [_jsx("td", { children: v.version }), _jsxs("td", { children: [v.accuracy, "%"] }), _jsx("td", { children: new Date(v.created_at).toLocaleDateString() }), _jsx("td", { children: _jsx(Button, { variant: "secondary", onClick: () => rollbackModel(String(v.version ?? "")), children: "Rollback" }) })] }, i))) })] })] }))] }));
}
