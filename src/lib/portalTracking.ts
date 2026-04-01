// ---- Portal Performance Intelligence ----
declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
  }
}

export const trackPortalEvent = (
  eventName: string,
  payload: Record<string, unknown> = {}
) => {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      timestamp: Date.now(),
      app: "portal",
      ...payload,
    });
  }
};
