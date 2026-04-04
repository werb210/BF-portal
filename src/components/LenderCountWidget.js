import { jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function LenderCountWidget() {
    const [count, setCount] = useState(0);
    useEffect(() => {
        api("/public/lender-count")
            .then((data) => setCount(data.count ?? 0))
            .catch(() => setCount(0));
    }, []);
    return _jsxs("div", { children: ["Active Lenders: ", count] });
}
