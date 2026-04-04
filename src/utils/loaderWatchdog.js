import { getRequestId } from "@/utils/requestId";
import { getPendingRequests } from "@/utils/requestTracking";
import { setUiFailure } from "@/utils/uiFailureStore";
import { logger } from "@/utils/logger";
const TIMEOUT_MS = 8000;
const activeLoaders = new Map();
const createLoaderId = () => `loader_${Math.random().toString(36).slice(2, 10)}`;
export const startLoaderWatchdog = (route) => {
    const loaderId = createLoaderId();
    const resolvedRoute = route ?? (typeof window !== "undefined" ? window.location.pathname : "unknown");
    const startedAt = Date.now();
    activeLoaders.set(loaderId, { route: resolvedRoute, startedAt });
    const timer = window.setTimeout(() => {
        const pendingRequests = getPendingRequests();
        const requestId = getRequestId();
        logger.error("Loader watchdog timeout", {
            requestId,
            route: resolvedRoute,
            loaderId,
            pendingRequests
        });
        setUiFailure({
            message: "Loading is taking too long. Please refresh or contact support.",
            details: `Route: ${resolvedRoute} | Pending requests: ${pendingRequests.length}`,
            timestamp: Date.now()
        });
    }, TIMEOUT_MS);
    return () => {
        window.clearTimeout(timer);
        activeLoaders.delete(loaderId);
    };
};
export const getActiveLoaders = () => Array.from(activeLoaders.values());
