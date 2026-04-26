import { useCallback, useEffect, useState } from "react";
import { clearReloadGuardIfStale } from "@/utils/reloadGuard";
import { applyPortalSWUpdate } from "@/pwa/registerSW";

type UpdateDetail = {
  registration?: ServiceWorkerRegistration;
};

const isBrowser = typeof window !== "undefined";

export const useServiceWorkerUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!isBrowser) return;
    clearReloadGuardIfStale();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UpdateDetail>).detail;
      if (detail?.registration) {
        setRegistration(detail.registration);
      }
      setUpdateAvailable(true);
    };

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener("sw:update", handleUpdate);
    window.addEventListener("bf:sw-update-available", handleUpdateAvailable);

    return () => {
      window.removeEventListener("sw:update", handleUpdate);
      window.removeEventListener("bf:sw-update-available", handleUpdateAvailable);
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setUpdateAvailable(false);
      return;
    }

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    applyPortalSWUpdate();
    setUpdateAvailable(false);
  }, [registration]);

  const dismiss = useCallback(() => setUpdateAvailable(false), []);

  return {
    updateAvailable,
    applyUpdate,
    dismiss
  };
};
