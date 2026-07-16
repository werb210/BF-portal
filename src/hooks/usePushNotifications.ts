import { useCallback, useEffect, useMemo, useState } from "react";
import { getPushSubscription, setPushSubscription } from "@/utils/pushSubscriptionStore";
import { readPushPreference, writePushPreference } from "@/utils/notificationPreferences";
import { api } from "@/api"; // BF_PORTAL_PUSH_REGISTER_v1

type PushState = "unsupported" | "default" | "granted" | "denied";

const decodeBase64Key = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
};

// BF_PORTAL_PUSH_REGISTER_v1 -- send the browser PushSubscription to the server so web-push can reach this device.
const detectPushDeviceType = (): "mobile" | "desktop" =>
  typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";

const registerPushWithServer = async (sub: PushSubscription): Promise<void> => {
  try {
    const json = sub.toJSON() as unknown as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys || !json.keys.p256dh || !json.keys.auth) return;
    await api.post("/api/pwa/subscribe", {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      deviceType: detectPushDeviceType(),
    });
  } catch {
    // best-effort; the server upsert is idempotent so a later attempt will succeed
  }
};

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
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      setPushSubscription(existing);
      setSubscription(existing);
      await registerPushWithServer(existing); // BF_PORTAL_PUSH_REGISTER_v1
      return existing;
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidKey) {
      console.info("Push subscription skipped: missing VAPID key");
      return null;
    }

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Key(vapidKey)
    });
    setPushSubscription(newSubscription);
    setSubscription(newSubscription);
    await registerPushWithServer(newSubscription); // BF_PORTAL_PUSH_REGISTER_v1
    return newSubscription;
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
