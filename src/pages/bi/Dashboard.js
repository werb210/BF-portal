import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
export default function Dashboard() {
    const [data, setData] = useState(null);
    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const res = await api.get("/api/bi/dashboard");
                setData(res);
            }
            catch (e) {
                console.error(e);
                throw new Error("Something failed. Check console.");
            }
        };
        loadDashboard();
    }, []);
    if (!data)
        return _jsx("div", { children: "Loading..." });
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsx("h1", { children: "BI Dashboard" }), _jsxs("div", { style: { display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)" }, children: [_jsx(Card, { title: "Total Applications", value: data.totalApplications }), _jsx(Card, { title: "Documents Pending", value: data.documentsPending }), _jsx(Card, { title: "Approved", value: data.approved }), _jsx(Card, { title: "Rejected", value: data.rejected }), _jsx(Card, { title: "Referrers", value: data.referrers }), _jsx(Card, { title: "Lenders", value: data.lenders })] })] }));
}
function Card({ title, value }) {
    return (_jsxs("div", { style: {
            background: "#10263f",
            padding: 20,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)"
        }, children: [_jsx("h3", { children: title }), _jsx("h2", { children: value })] }));
}
