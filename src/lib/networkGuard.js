const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const stack = new Error().stack || "";
    if (!stack.includes("api.ts")) {
        throw new Error("RAW_FETCH_BLOCKED");
    }
    return originalFetch(...args);
};
Object.freeze(window.fetch);
export function isOnline() {
    if (typeof navigator === "undefined")
        return true;
    return navigator.onLine;
}
export function requireOnline() {
    if (!isOnline()) {
        throw new Error("OFFLINE");
    }
}
