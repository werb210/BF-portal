import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { useAuth } from "../../auth/AuthContext";
import { createApi } from "@/apiFactory";
import { usePolling } from "../../hooks/usePolling";
import Skeleton from "../../components/Skeleton";
export default function SLFPipeline() {
    const { silo } = useSilo();
    const { token } = useAuth();
    const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
    const [deals, setDeals] = useState([]);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const loadDeals = useCallback(async () => {
        const res = await api.get("/deals");
        setDeals(res);
        setIsLoading(false);
    }, [api]);
    useEffect(() => {
        void loadDeals();
    }, [loadDeals]);
    usePolling(() => {
        void loadDeals();
    });
    async function updateStatus(id, status) {
        await api.patch(`/slf/deals/${id}/status`, { status });
        await loadDeals();
    }
    async function openDeal(id) {
        const result = await api.get(`/slf/deals/${id}`);
        setSelectedDeal(result);
    }
    const columns = ["received", "processing", "completed"];
    return (_jsxs("div", { children: [_jsx("div", { style: { display: "flex", gap: 20 }, children: columns.map((col) => (_jsxs("div", { style: { flex: 1 }, children: [_jsx("h3", { children: col.toUpperCase() }), isLoading ? (_jsx(Skeleton, { count: 3, height: 90 })) : (deals
                            .filter((d) => d.status === col)
                            .map((deal) => (_jsxs("div", { style: {
                                background: "#0f172a",
                                padding: 12,
                                marginBottom: 10,
                                borderRadius: 6
                            }, children: [_jsx("button", { onClick: () => openDeal(deal.id), style: { display: "block", marginBottom: 6 }, children: _jsx("strong", { children: deal.external_id }) }), _jsx("div", { children: deal.product_family }), _jsx("button", { onClick: () => updateStatus(deal.id, "processing"), children: "Move to Processing" }), _jsx("button", { onClick: () => updateStatus(deal.id, "completed"), children: "Complete" })] }, deal.id))))] }, col))) }), selectedDeal ? (_jsxs("aside", { style: { marginTop: 16, border: "1px solid #334155", borderRadius: 8, padding: 12 }, children: [_jsx("h3", { children: "Deal Detail" }), _jsxs("p", { children: ["External ID: ", selectedDeal.external_id ?? "-"] }), _jsxs("p", { children: ["Created at: ", selectedDeal.created_at ?? "-"] }), _jsxs("p", { children: ["Last updated: ", selectedDeal.updated_at ?? "-"] }), _jsx("h4", { children: "Status history" }), _jsx("ul", { children: (selectedDeal.status_history ?? []).map((item, index) => (_jsxs("li", { children: [item.status, " at ", item.at] }, `${item.at}-${index}`))) }), _jsx("h4", { children: "Logs" }), _jsx("ul", { children: (selectedDeal.logs ?? []).map((log, index) => (_jsxs("li", { children: [log.created_at ?? "-", ": ", log.message ?? "-"] }, log.id ?? `${log.created_at ?? "log"}-${index}`))) }), _jsx("button", { onClick: () => setSelectedDeal(null), children: "Close" })] })) : null] }));
}
