import { logger } from "@/utils/logger";
export const reconnectRealtime = () => {
    if (typeof window === "undefined")
        return;
    const connector = window.portalRealtime;
    if (!connector?.reconnect)
        return;
    try {
        connector.reconnect();
    }
    catch (error) {
        logger.warn("Realtime reconnect failed.", { error });
    }
};
