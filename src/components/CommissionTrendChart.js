import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function CommissionTrendChart() {
    const [data, setData] = useState([]);
    useEffect(() => {
        api("/analytics/commission-trend")
            .then(setData)
            .catch(console.error);
    }, []);
    return (_jsx("div", { children: data.map((item) => (_jsxs("div", { children: [item.date, ": $", item.commission] }, item.date))) }));
}
