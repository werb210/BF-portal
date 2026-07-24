import { useEffect } from "react";
import { registerPushNotifications } from "@/native/pushNotifications";

export default function PushNotificationsProvider() {
  useEffect(() => {
    void registerPushNotifications().then((result) => {
      if (result.state === "registered") console.info("[push] registered for banner notifications");
      else if (result.state === "error") console.warn("[push] registration failed", result.error);
    });
  }, []);
  return null;
}
