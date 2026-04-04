import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
export const useNotificationPermissionPrompt = () => {
    const { user, authStatus } = useAuth();
    const { permission, requestPermission, hasPrompted, hydratePreference } = usePushNotifications();
    const promptedRef = useRef(false);
    useEffect(() => {
        if (authStatus !== "authenticated")
            return;
        const userId = user?.id ?? null;
        hydratePreference(userId);
    }, [authStatus, hydratePreference, user]);
    useEffect(() => {
        if (authStatus !== "authenticated")
            return;
        if (promptedRef.current)
            return;
        if (permission !== "default")
            return;
        if (hasPrompted)
            return;
        promptedRef.current = true;
        if (typeof window === "undefined")
            return;
        const timeout = window.setTimeout(() => {
            void requestPermission();
        }, 1200);
        return () => window.clearTimeout(timeout);
    }, [authStatus, hasPrompted, permission, requestPermission]);
};
