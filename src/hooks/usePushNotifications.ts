import { useCallback, useEffect, useMemo, useState } from "react";
import { getPushSubscription, setPushSubscription } from "@/utils/pushSubscriptionStore";
import { readPushPreference, writePushPreference } from "@/utils/notificationPreferences";
import { registerExistingPushPermission } from "@/hooks/usePushRegistration";

type PushState = "unsupported" | "default" | "granted" | "denied";

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<PushState>("unsupported");
  const [subscription, setSubscription] = useState<PushSubscription | null>(getPushSubscription());
  const [prompted, setPrompted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const preference = useMemo(() => readPushPreference(userId), [userId]);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return null;
    }
    const registration = await navigator.serviceWorker.ready;
    // BF_PORTAL_PUSH_VAPID_ROTATE_v1 -- the shared registrar owns VAPID-key
    // comparison, stale subscription rotation, and the server upsert.
    await registerExistingPushPermission();
    const current = await registration.pushManager.getSubscription();
    setPushSubscription(current);
    setSubscription(current);
    return current;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    const syncPermission = () => {
      setPermission(Notification.permission);
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !event.newValue) return;
      if (event.key.startsWith("staff-portal:push-permission:")) {
        try {
          const next = JSON.parse(event.newValue) as { status?: PushState; prompted?: boolean };
          if (next.status) {
            setPermission(next.status);
          }
          if (typeof next.prompted === "boolean") {
            setPrompted(next.prompted);
          }
        } catch {
          // ignore parse errors
        }
      }
    };

    const handlePermissionUpdate = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      if (event.detail) {
        setPermission(event.detail as PushState);
      }
    };

    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("push-permission-update", handlePermissionUpdate);

    return () => {
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("push-permission-update", handlePermissionUpdate);
    };
  }, []);

  useEffect(() => {
    if (permission === "granted" && !subscription) {
      void subscribe();
    }
  }, [permission, subscribe, subscription]);

  useEffect(() => {
    if (!userId || permission === "unsupported") return;
    if (permission === "default" && !preference.prompted) return;
    writePushPreference(userId, {
      status: permission,
      prompted: preference.prompted || prompted,
      updatedAt: Date.now()
    });
  }, [permission, preference.prompted, prompted, userId]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return null;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    setPrompted(true);
    writePushPreference(userId, { status: result, prompted: true, updatedAt: Date.now() });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("push-permission-update", { detail: result }));
    }
    if (result === "granted") {
      return subscribe();
    }
    return null;
  }, [subscribe, userId]);

  const hydratePreference = useCallback(
    (nextUserId: string | null) => {
      setUserId(nextUserId);
      const stored = readPushPreference(nextUserId);
      setPrompted(stored.prompted);
      if (stored.status !== "default") {
        setPermission(stored.status);
      }
    },
    []
  );

  return {
    permission,
    subscription,
    requestPermission,
    isSupported: permission !== "unsupported",
    hasPrompted: prompted,
    hydratePreference,
    preference
  };
};
