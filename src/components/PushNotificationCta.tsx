import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";

const PushNotificationCta = () => {
  const { user, authStatus } = useAuth();
  const { permission, requestPermission, isSupported, hasPrompted, hydratePreference } =
    usePushNotifications();

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const userId = (user as { id?: string } | null)?.id ?? null;
    hydratePreference(userId);
  }, [authStatus, hydratePreference, user]);

  if (!isSupported) return null;

  if (permission === "denied") {
    return <span className="text-xs text-slate-500">Notifications are blocked in browser settings.</span>;
  }

  if (permission === "granted") {
    return null;
  }

  return (
    <Button variant="ghost" onClick={() => void requestPermission()}>
      {hasPrompted ? "Enable Notifications" : "Allow Notifications"}
    </Button>
  );
};

export default PushNotificationCta;
