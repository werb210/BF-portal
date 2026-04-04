import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import SiloSelector from "../../components/SiloSelector";
import { createApi } from "@/apiFactory";
import { useSilo } from "../../context/SiloContext";
import { useAuth } from "../../auth/AuthContext";
export default function BFDashboard() {
    const { silo } = useSilo();
    const { token } = useAuth();
    const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
    const [status, setStatus] = useState("Idle");
    return (_jsxs("div", { children: [_jsx("h2", { children: "BF Dashboard" }), _jsx(SiloSelector, {}), _jsxs("p", { children: ["Current silo: ", silo.toUpperCase()] }), _jsx("button", { onClick: () => {
                    setStatus(`API base: ${api.defaults.baseURL ?? "unknown"}`);
                }, children: "Show API Base" }), _jsx("pre", { children: status })] }));
}
