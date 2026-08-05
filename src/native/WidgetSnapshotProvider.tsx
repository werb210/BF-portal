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
import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useSilo } from "@/context/SiloContext";
import { publishWidgetSnapshot } from "@/native/widgetSnapshot";

const POLL_MS = 10 * 60 * 1000;

// Widget deep links arrive as bfportal://<host>. Anything not listed is ignored
// rather than navigated to, so a stale widget can never push the app somewhere
// that no longer exists.
const ROUTES: Record<string, string> = {
  applications: "/pipeline",
  pipeline: "/pipeline",
  tasks: "/calendar",
  calendar: "/calendar",
  dashboard: "/dashboard",
};

export default function WidgetSnapshotProvider() {
  const { silo } = useSilo();
  const navigate = useNavigate();
  const siloRef = useRef(silo);
  siloRef.current = silo;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void publishWidgetSnapshot(siloRef.current);
    const timer = window.setInterval(() => {
      void publishWidgetSnapshot(siloRef.current);
    }, POLL_MS);

    const stateHandle = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void publishWidgetSnapshot(siloRef.current);
    });

    const urlHandle = App.addListener("appUrlOpen", ({ url }) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "bfportal:") return;
        const target = ROUTES[parsed.hostname];
        if (target) navigate(target);
      } catch {
        // A malformed URL from outside the app must never throw into React.
      }
    });

    return () => {
      window.clearInterval(timer);
      void stateHandle.then((h) => h.remove());
      void urlHandle.then((h) => h.remove());
    };
  }, [navigate]);

  // Silo is the one thing that changes what the widget should show, so a switch
  // republishes immediately rather than waiting for the next poll.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void publishWidgetSnapshot(silo);
  }, [silo]);

  return null;
}
