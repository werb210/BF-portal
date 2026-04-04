import { getRequestId } from "@/utils/requestId";
import { setUiFailure } from "@/utils/uiFailureStore";
import { logger } from "@/utils/logger";
const REDIRECT_WINDOW_MS = 2000;
const redirectTimestamps = [];
let lastRedirectKey = null;
export const recordRedirect = (route, reason, redirectKey) => {
    const now = Date.now();
    if (redirectKey && redirectKey === lastRedirectKey) {
        return;
    }
    if (redirectKey) {
        lastRedirectKey = redirectKey;
    }
    redirectTimestamps.push(now);
    while (redirectTimestamps.length > 0) {
        const firstTimestamp = redirectTimestamps[0];
        if (!firstTimestamp || now - firstTimestamp <= REDIRECT_WINDOW_MS) {
            break;
        }
        redirectTimestamps.shift();
    }
    if (redirectTimestamps.length > 1) {
        const requestId = getRequestId();
        const message = "Redirect loop detected within 2 seconds.";
        logger.error(message, {
            requestId,
            route,
            reason,
            redirectCount: redirectTimestamps.length
        });
        setUiFailure({
            message: "Redirect loop detected.",
            details: `Route: ${route} | Reason: ${reason} | Request ID: ${requestId}`,
            timestamp: Date.now()
        });
        throw new Error(`${message} (requestId: ${requestId})`);
    }
};
export const resetRedirectTracking = () => {
    redirectTimestamps.splice(0, redirectTimestamps.length);
    lastRedirectKey = null;
};
