import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createApi } from "@/apiFactory";
import { useAuth } from "../auth/AuthContext";
export default function GlobalAdmin() {
    const { token } = useAuth();
    const bfApi = useMemo(() => createApi("bf", token ?? ""), [token]);
    const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
    const slfApi = useMemo(() => createApi("slf", token ?? ""), [token]);
    const [counts, setCounts] = useState({ bfApplications: 0, biApplications: 0, slfDeals: 0 });
    useEffect(() => {
        async function loadCounts() {
            const [bfApps, biApps, slfDeals] = await Promise.all([
                bfApi.get("/admin/applications"),
                biApi.get("/admin/applications"),
                slfApi.get("/deals")
            ]);
            setCounts({
                bfApplications: bfApps.length,
                biApplications: biApps.length,
                slfDeals: slfDeals.length
            });
        }
        void loadCounts();
    }, [bfApi, biApi, slfApi]);
    return (_jsxs("div", { children: [_jsx("h2", { children: "Global Admin Dashboard" }), _jsxs("ul", { children: [_jsxs("li", { children: ["BI applications count: ", counts.biApplications] }), _jsxs("li", { children: ["SLF deal count: ", counts.slfDeals] }), _jsxs("li", { children: ["BF applications count: ", counts.bfApplications] })] })] }));
}
