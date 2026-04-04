import { resetPortalSessionGuard } from "@/auth/portalSessionGuard";
import { resetAuthState } from "@/utils/authReset";
import { clearServiceWorkerCaches } from "@/utils/sessionCleanup";
const unregisterServiceWorkers = async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
        return;
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    catch {
        // ignore service worker errors
    }
};
export const performLogoutCleanup = async () => {
    resetPortalSessionGuard();
    await resetAuthState();
    await clearServiceWorkerCaches();
    await unregisterServiceWorkers();
};
