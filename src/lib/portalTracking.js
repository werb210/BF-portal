export const trackPortalEvent = (eventName, payload = {}) => {
    if (typeof window !== "undefined" && window.dataLayer) {
        window.dataLayer.push({
            event: eventName,
            timestamp: Date.now(),
            app: "portal",
            ...payload,
        });
    }
};
