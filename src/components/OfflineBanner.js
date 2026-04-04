import { jsx as _jsx } from "react/jsx-runtime";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
const OfflineBanner = () => {
    const { isOffline } = useNetworkStatus();
    if (!isOffline)
        return null;
    return (_jsx("div", { className: "offline-banner", role: "status", "aria-live": "polite", children: "You\u2019re offline \u2014 some features may be unavailable" }));
};
export default OfflineBanner;
