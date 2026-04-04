import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApiStatusStore } from "@/state/apiStatus";
const ApiStatusBanner = () => {
    const status = useApiStatusStore((state) => state.status);
    if (status === "unavailable") {
        return (_jsxs("div", { className: "api-status-banner", role: "status", children: [_jsx("strong", { children: "Server unavailable." }), " Some data may be out of date. Please retry in a moment."] }));
    }
    if (status === "degraded") {
        return (_jsxs("div", { className: "api-status-banner", role: "status", children: [_jsx("strong", { children: "System temporarily unavailable." }), " Some features are operating in degraded mode."] }));
    }
    if (status === "forbidden") {
        return (_jsxs("div", { className: "api-status-banner", role: "status", children: [_jsx("strong", { children: "Permission required." }), " You do not have access to this resource."] }));
    }
    return null;
};
export default ApiStatusBanner;
