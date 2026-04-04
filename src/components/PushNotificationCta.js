import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
const PushNotificationCta = () => {
    const { user, authStatus } = useAuth();
    const { permission, requestPermission, isSupported, hasPrompted, hydratePreference } = usePushNotifications();
    useEffect(() => {
        if (authStatus !== "authenticated")
            return;
        const userId = user?.id ?? null;
        hydratePreference(userId);
    }, [authStatus, hydratePreference, user]);
    if (!isSupported)
        return null;
    if (permission === "denied") {
        return _jsx("span", { className: "text-xs text-slate-500", children: "Notifications are blocked in browser settings." });
    }
    if (permission === "granted") {
        return _jsx("span", { className: "text-xs text-emerald-600", children: "Notifications enabled" });
    }
    return (_jsx(Button, { variant: "ghost", onClick: () => void requestPermission(), children: hasPrompted ? "Enable Notifications" : "Allow Notifications" }));
};
export default PushNotificationCta;
