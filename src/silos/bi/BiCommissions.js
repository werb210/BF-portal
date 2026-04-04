import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function BiCommissions() {
    const [apps, setApps] = useState([]);
    const [totalAnnualPremium, setTotalAnnualPremium] = useState(0);
    const [totalCommission, setTotalCommission] = useState(0);
    useEffect(() => {
        api("/bi/applications")
            .then((data) => {
            const approved = data.filter((a) => a.status === "approved");
            let premiumTotal = 0;
            approved.forEach((app) => {
                const rate = app.secured_type === "secured" ? 0.016 : 0.04;
                premiumTotal += app.loan_amount * rate;
            });
            setTotalAnnualPremium(premiumTotal);
            setTotalCommission(premiumTotal * 0.1);
            setApps(approved);
        });
    }, []);
    return (_jsxs("div", { children: [_jsx("h2", { children: "BI Recurring Commission Dashboard" }), _jsxs("div", { style: { marginBottom: 30 }, children: [_jsxs("h3", { children: ["Total Annual Premiums: $", totalAnnualPremium.toLocaleString()] }), _jsxs("h3", { children: ["Your 10% Commission: $", totalCommission.toLocaleString()] })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Loan" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: apps.map((app) => (_jsxs("tr", { children: [_jsxs("td", { children: [app.first_name, " ", app.last_name] }), _jsxs("td", { children: ["$", app.loan_amount.toLocaleString()] }), _jsx("td", { children: app.secured_type }), _jsx("td", { children: app.status })] }, app.id))) })] })] }));
}
