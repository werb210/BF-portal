import { useCallback, useEffect, useState } from "react";
import { clearReloadGuardIfStale, triggerSafeReload } from "@/utils/reloadGuard";
const isBrowser = typeof window !== "undefined";
export const useServiceWorkerUpdate = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState(null);
    useEffect(() => {
        if (!isBrowser)
            return;
        clearReloadGuardIfStale();
        const handleUpdate = (event) => {
            const detail = event.detail;
            if (detail?.registration) {
                setRegistration(detail.registration);
            }
            setUpdateAvailable(true);
        };
        const handleControllerChange = () => {
            triggerSafeReload("service-worker-controller-change");
        };
        window.addEventListener("sw:update", handleUpdate);
        navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);
        return () => {
            window.removeEventListener("sw:update", handleUpdate);
            navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);
    const applyUpdate = useCallback(async () => {
        if (!registration)
            return;
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setUpdateAvailable(false);
            return;
        }
        if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            setUpdateAvailable(false);
            return;
        }
        try {
            await registration.update();
            setUpdateAvailable(false);
        }
        catch {
            setUpdateAvailable(false);
        }
    }, [registration]);
    const dismiss = useCallback(() => setUpdateAvailable(false), []);
    return {
        updateAvailable,
        applyUpdate,
        dismiss
    };
};
