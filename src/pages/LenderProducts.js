import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchClientLenderProducts } from "@/api/lenders";
export default function LenderProducts() {
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState(null);
    useEffect(() => {
        fetchClientLenderProducts()
            .then(setRows)
            .catch(() => setErr("Failed to load lender products"));
    }, []);
    if (err)
        return _jsx("div", { role: "alert", children: err });
    return (_jsxs("div", { children: [_jsx("h1", { children: "Lender Products" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Lender" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Min" }), _jsx("th", { children: "Max" })] }) }), _jsx("tbody", { children: rows.map(r => (_jsxs("tr", { children: [_jsx("td", { children: r.lender_name }), _jsx("td", { children: r.name }), _jsx("td", { children: r.product_type }), _jsx("td", { children: r.min_amount ?? "-" }), _jsx("td", { children: r.max_amount ?? "-" })] }, r.id))) })] })] }));
}
