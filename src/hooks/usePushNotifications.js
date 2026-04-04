import { useCallback, useEffect, useMemo, useState } from "react";
import { getPushSubscription, setPushSubscription } from "@/utils/pushSubscriptionStore";
import { readPushPreference, writePushPreference } from "@/utils/notificationPreferences";
const decodeBase64Key = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
        output[i] = raw.charCodeAt(i);
    }
    return output;
};
export const usePushNotifications = () => {
    const [permission, setPermission] = useState("unsupported");
    const [subscription, setSubscription] = useState(getPushSubscription());
    const [prompted, setPrompted] = useState(false);
    const [userId, setUserId] = useState(null);
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
            return existing;
        }
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
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
        const handleStorage = (event) => {
            if (!event.key || !event.newValue)
                return;
            if (event.key.startsWith("staff-portal:push-permission:")) {
                try {
                    const next = JSON.parse(event.newValue);
                    if (next.status) {
                        setPermission(next.status);
                    }
                    if (typeof next.prompted === "boolean") {
                        setPrompted(next.prompted);
                    }
                }
                catch {
                    // ignore parse errors
                }
            }
        };
        const handlePermissionUpdate = (event) => {
            if (!(event instanceof CustomEvent))
                return;
            if (event.detail) {
                setPermission(event.detail);
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
        if (!userId || permission === "unsupported")
            return;
        if (permission === "default" && !preference.prompted)
            return;
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
    const hydratePreference = useCallback((nextUserId) => {
        setUserId(nextUserId);
        const stored = readPushPreference(nextUserId);
        setPrompted(stored.prompted);
        if (stored.status !== "default") {
            setPermission(stored.status);
        }
    }, []);
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
