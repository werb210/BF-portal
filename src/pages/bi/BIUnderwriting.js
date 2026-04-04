import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { useAuth } from "../../auth/AuthContext";
import { createApi } from "@/apiFactory";
export default function BIUnderwriting() {
    const { silo } = useSilo();
    const { token } = useAuth();
    const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
    const [apps, setApps] = useState([]);
    useEffect(() => {
        async function load() {
            const res = await api.get("/admin/applications");
            setApps(res);
        }
        void load();
    }, [api]);
    async function updateStatus(id, status) {
        await api.patch(`/admin/application/${id}/status`, { status });
        const res = await api.get("/admin/applications");
        setApps(res);
    }
    return (_jsxs("div", { children: [_jsx("h2", { children: "BI Underwriting" }), apps.map((a) => (_jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("strong", { children: a.id }), _jsxs("div", { children: ["Status: ", a.status] }), _jsx("button", { onClick: () => updateStatus(a.id, "approved"), children: "Approve" }), _jsx("button", { onClick: () => updateStatus(a.id, "declined"), children: "Decline" })] }, a.id)))] }));
}
