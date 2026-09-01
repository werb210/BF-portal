// BF_PORTAL_WIDGET_SNAPSHOT_v13
// Republishes the widget snapshot whenever the app is foregrounded, and routes
// taps on the widget back into the right screen.
//
// Cadence matters here. WidgetKit is pull-based and budgeted - Apple's guidance
// is roughly 40-70 refreshes a day, so every 15-60 minutes, and reloadTimelines
// is a hint rather than a guarantee. Writing on every foreground is the only
// reliable freshness lever we control, and since staff open the portal through
// the day the widget stays current within a working session. A slow poll fills
// the gaps while the app is open. This is why the snapshot carries capturedAt:
// the widget should render "as of HH:mm" and never imply live data.
import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useNavigate } from "react-router-dom";
import { useSilo } from "@/context/SiloContext";
import { publishWidgetSnapshot } from "@/native/widgetSnapshot";
import { mirrorSiloToWidget, WidgetBridgePlugin, WIDGET_GROUP, isNativeIOS } from "@/native/widgetBridge";

const POLL_MS = 10 * 60 * 1000;

// Widget deep links arrive as bfportal://<host>. Anything not listed is ignored
// rather than navigated to, so a stale widget can never push the app somewhere
// that no longer exists.
export function widgetRoute(url: string): { silo?: "BF" | "BI" | "SLF"; path: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "bfportal:") return null;
    const rawSilo = parsed.searchParams.get("silo")?.toUpperCase();
    const silo = rawSilo === "BF" || rawSilo === "BI" || rawSilo === "SLF" ? rawSilo : undefined;
    switch (parsed.hostname) {
      case "applications": case "pipeline": return { silo, path: "/pipeline" };
      case "crm": return { silo, path: "/crm" };
      case "calendar": return { silo, path: "/calendar" };
      case "tasks": {
        const view = parsed.searchParams.get("view");
        const suffix = view && ["due_today", "overdue", "upcoming", "completed"].includes(view) ? `?view=${view}` : "";
        return { silo, path: `/tasks${suffix}` };
      }
      case "messages": return { silo, path: `/communications?tab=inbox${parsed.searchParams.get("filter") === "unread" ? "&filter=unread" : ""}` };
      case "commission": return { silo, path: silo === "BI" ? "/bi/commissions" : "/portal?focus=commission" };
      default: return { silo, path: "/portal" };
    }
  } catch { return null; }
}

export default function WidgetSnapshotProvider() {
  const { silo, setSilo } = useSilo();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNativeIOS()) return;

    // Migration cleanup only: remove the sensitive value written by older builds.
    void WidgetBridgePlugin.removeItem({ group: WIDGET_GROUP, key: "widget_auth_token" }).catch(() => {});

    void publishWidgetSnapshot();
    const timer = window.setInterval(() => {
      void publishWidgetSnapshot();
    }, POLL_MS);

    const stateHandle = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void publishWidgetSnapshot();
    });

    const urlHandle = App.addListener("appUrlOpen", ({ url }) => {
      try {
        const target = widgetRoute(url);
        if (!target) return;
        if (target.silo) setSilo(target.silo);
        navigate(target.path);
      } catch {
        // A malformed URL from outside the app must never throw into React.
      }
    });

    return () => {
      window.clearInterval(timer);
      void stateHandle.then((h) => h.remove());
      void urlHandle.then((h) => h.remove());
    };
  }, [navigate, setSilo]);

  // Silo is the one thing that changes what the widget should show, so a switch
  // republishes immediately rather than waiting for the next poll.
  useEffect(() => {
    if (!isNativeIOS()) return;
    void (async () => {
      await mirrorSiloToWidget(silo);
      await publishWidgetSnapshot();
    })();
  }, [silo]);

  return null;
}
