export const clearClientStorage = () => {
    if (typeof window === "undefined")
        return;
    try {
        window.sessionStorage.clear();
    }
    catch {
        // ignore storage errors
    }
    try {
        window.sessionStorage.clear();
    }
    catch {
        // ignore storage errors
    }
};
export const clearServiceWorkerCaches = async () => {
    if (typeof caches !== "undefined") {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
        }
        catch {
            // ignore cache errors
        }
    }
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
        return;
    try {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "CLEAR_CACHES" });
    }
    catch {
        // ignore service worker errors
    }
};
