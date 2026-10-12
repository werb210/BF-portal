import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerPushNotifications } from "@/native/pushNotifications";
import { widgetRoute } from "@/native/WidgetSnapshotProvider";
import { handlePushAction, safeDeepLink } from "@/native/pushActions";

// BF_PORTAL_v789_PUSH_ROUTING - BF-Server sends plain paths (/applications/:id, /tasks, ...). Only
// bfportal: links were understood, so a tap on a normal notification opened nothing. Taps now go through
// pushActions (safeDeepLink): plain in-app paths are followed, anything else falls back to the app root,
// and bfportal: widget links keep working.
export function pushTapRoute(url: string): string {
  if (/^bfportal:/i.test(url.trim())) return widgetRoute(url.trim())?.path ?? "/";
  return safeDeepLink(url);
}

export function handlePushTap(url: string, actionId: string | undefined, navigate: (route: string) => void): void {
  handlePushAction({ actionId, data: { deepLink: pushTapRoute(url) } }, { navigate });
}

export default function PushNotificationsProvider() {
  const navigate = useNavigate();
  useEffect(() => {
    let remove: (() => Promise<void>) | undefined;
    void registerPushNotifications((url, actionId) => handlePushTap(url, actionId, navigate)).then((setup) => {
      remove = setup.remove;
      if (setup.result.state === "registered") console.info("[push] native registration ready; server adapter is not configured");
      else if (setup.result.state === "error") console.warn("[push] registration failed", setup.result.error);
    });
    return () => { void remove?.(); };
  }, [navigate]);
  return null;
}
