import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSilo } from "../../context/SiloContext";
import { createApi } from "@/apiFactory";
import { useAuth } from "../../auth/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { usePolling } from "../../hooks/usePolling";
import Skeleton from "../../components/Skeleton";
export default function BICommissionDashboard() {
    const { silo } = useSilo();
    const { token } = useAuth();
    const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const load = useCallback(async () => {
        const result = await api.get("/admin/commissions");
        const grouped = result.map((c) => ({
            name: c.application_id.slice(0, 6),
            commission: Number(c.commission_amount || 0),
            policyId: c.application_id
        }));
        setData(grouped);
        setIsLoading(false);
    }, [api]);
    useEffect(() => {
        void load();
    }, [load]);
    usePolling(() => {
        void load();
    });
    if (isLoading) {
        return (_jsxs("div", { style: { width: "100%", height: 400 }, children: [_jsx("h2", { children: "Recurring Commission Overview" }), _jsx(Skeleton, { height: 320 })] }));
    }
    return (_jsxs("div", { style: { width: "100%", height: 400 }, children: [_jsx("h2", { children: "Recurring Commission Overview" }), _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: data, children: [_jsx(CartesianGrid, { stroke: "#444" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "commission", fill: "#00bcd4" })] }) }), _jsxs("div", { style: { marginTop: 12 }, children: [_jsx("h3", { children: "Policies" }), _jsx("ul", { children: data.map((item) => (_jsx("li", { children: _jsx(Link, { to: `/bi/commissions/${item.policyId}`, children: item.policyId }) }, item.policyId))) })] })] }));
}
