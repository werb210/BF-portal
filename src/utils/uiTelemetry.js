let authTelemetryContext = {
    authStatus: "unauthenticated",
    role: null,
    silo: null
};
const getRoutePath = () => {
    if (typeof window === "undefined")
        return "unknown";
    return window.location.pathname || "unknown";
};
export const setAuthTelemetryContext = (next) => {
    authTelemetryContext = { ...authTelemetryContext, ...next };
};
export const emitUiTelemetry = (event, payload = {}) => {
    const basePayload = {
        event,
        route: getRoutePath(),
        authStatus: authTelemetryContext.authStatus,
        role: authTelemetryContext.role,
        silo: authTelemetryContext.silo
    };
    console.info("[telemetry] ui", { ...basePayload, ...payload });
};
