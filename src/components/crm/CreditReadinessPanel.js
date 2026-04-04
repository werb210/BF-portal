import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function CreditReadinessPanel({ contactId }) {
    const [data, setData] = useState(null);
    useEffect(() => {
        api
            .get(`/portal/contacts/${contactId}/credit-readiness`)
            .then((res) => setData(res))
            .catch(() => { });
    }, [contactId]);
    if (!data)
        return _jsx("div", { className: "p-4 text-sm text-neutral-500", children: "No credit readiness submitted." });
    return (_jsxs("div", { className: "space-y-3 p-4 text-sm", children: [_jsxs("div", { children: [_jsx("strong", { children: "Industry:" }), " ", data.industry] }), _jsxs("div", { children: [_jsx("strong", { children: "Years in Business:" }), " ", data.yearsInBusiness] }), _jsxs("div", { children: [_jsx("strong", { children: "Monthly Revenue:" }), " ", data.monthlyRevenue] }), _jsxs("div", { children: [_jsx("strong", { children: "Annual Revenue:" }), " ", data.annualRevenue] }), _jsxs("div", { children: [_jsx("strong", { children: "A/R Outstanding:" }), " ", data.arOutstanding] }), _jsxs("div", { children: [_jsx("strong", { children: "Available Collateral:" }), " ", data.availableCollateral] }), _jsxs("div", { children: [_jsx("strong", { children: "Preliminary Score:" }), " ", data.score] })] }));
}
