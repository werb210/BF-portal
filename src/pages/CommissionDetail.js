import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { createApi } from "@/apiFactory";
import { useAuth } from "../auth/AuthContext";
import Skeleton from "../components/Skeleton";
export default function CommissionDetail() {
    const { policyId } = useParams();
    const { token } = useAuth();
    const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
    const [detail, setDetail] = useState(null);
    useEffect(() => {
        async function load() {
            if (!policyId)
                return;
            const result = await biApi.get(`/bi/admin/commissions/${policyId}`);
            setDetail(result);
        }
        void load();
    }, [biApi, policyId]);
    if (!detail) {
        return (_jsxs("div", { children: [_jsx("h2", { children: "Commission Detail" }), _jsx(Skeleton, { count: 6, height: 24 })] }));
    }
    const premiumRows = detail.premium_rows ?? [];
    const paidCount = premiumRows.filter((row) => row.paid).length;
    const unpaidCount = premiumRows.length - paidCount;
    return (_jsxs("div", { children: [_jsx("h2", { children: "Commission Detail" }), _jsxs("p", { children: ["Policy number: ", detail.policy_number ?? policyId] }), _jsxs("p", { children: ["Paid vs unpaid: ", paidCount, " paid / ", unpaidCount, " unpaid"] }), _jsx("h3", { children: "Premium Rows" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Period" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: premiumRows.map((row, index) => (_jsxs("tr", { children: [_jsx("td", { children: row.period ?? "-" }), _jsx("td", { children: row.amount ?? 0 }), _jsx("td", { children: row.paid ? "Paid" : "Unpaid" })] }, `${row.period ?? "period"}-${index}`))) })] }), _jsx("h3", { children: "Ledger Entries" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created at" })] }) }), _jsx("tbody", { children: (detail.ledger_entries ?? []).map((entry, index) => (_jsxs("tr", { children: [_jsx("td", { children: entry.id ?? "-" }), _jsx("td", { children: entry.amount ?? 0 }), _jsx("td", { children: entry.status ?? "-" }), _jsx("td", { children: entry.created_at ?? "-" })] }, entry.id ?? `${entry.created_at ?? "entry"}-${index}`))) })] })] }));
}
