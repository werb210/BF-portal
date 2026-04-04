import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { createApi } from "@/apiFactory";
import { useAuth } from "../../auth/AuthContext";
export default function SLFDashboard() {
    const { silo } = useSilo();
    const { token } = useAuth();
    const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
    const [deals, setDeals] = useState([]);
    useEffect(() => {
        async function load() {
            const res = await api.get("/deals");
            setDeals(res);
        }
        void load();
    }, [api]);
    return (_jsxs("div", { children: [_jsx("h2", { children: "SLF Deals" }), _jsx("pre", { children: JSON.stringify(deals, null, 2) })] }));
}
