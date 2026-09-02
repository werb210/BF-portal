import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerPushNotifications } from "@/native/pushNotifications";
import { widgetRoute } from "@/native/WidgetSnapshotProvider";

export default function PushNotificationsProvider() {
  const navigate = useNavigate();
  useEffect(() => {
    let remove: (() => Promise<void>) | undefined;
    void registerPushNotifications((url) => {
      const target = widgetRoute(url);
      if (target) navigate(target.path);
    }).then((setup) => {
      remove = setup.remove;
      if (setup.result.state === "registered") console.info("[push] native registration ready; server adapter is not configured");
      else if (setup.result.state === "error") console.warn("[push] registration failed", setup.result.error);
    });
    return () => { void remove?.(); };
  }, [navigate]);
  return null;
}
