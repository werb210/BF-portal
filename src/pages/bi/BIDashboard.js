import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { createApi } from "@/apiFactory";
import { useAuth } from "../../auth/AuthContext";
export default function BIDashboard() {
    const { silo } = useSilo();
    const { token } = useAuth();
    const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
    const [applications, setApplications] = useState([]);
    const [commissions, setCommissions] = useState([]);
    useEffect(() => {
        async function load() {
            const apps = await api.get("/admin/applications");
            const commissionsData = await api.get("/admin/commissions");
            setApplications(Array.isArray(apps) ? apps : []);
            setCommissions(Array.isArray(commissionsData) ? commissionsData : []);
        }
        void load();
    }, [api]);
    return (_jsxs("div", { children: [_jsx("h2", { children: "BI Applications" }), _jsx("pre", { children: JSON.stringify(applications, null, 2) }), _jsx("h2", { children: "BI Commissions" }), _jsx("pre", { children: JSON.stringify(commissions, null, 2) })] }));
}
