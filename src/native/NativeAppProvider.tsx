import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useSilo } from "@/context/SiloContext";
import { widgetRoute } from "@/native/WidgetSnapshotProvider";

const ROOT_PATHS = new Set(["/", "/portal", "/login"]);

/** Shared native lifecycle, URL routing, and Android system-back integration. */
export default function NativeAppProvider() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSilo } = useSilo();
  const pathname = useRef(location.pathname);
  pathname.current = location.pathname;

  useEffect(() => {
    // The established WidgetSnapshotProvider owns iOS lifecycle and URL events.
    // Keep this provider Android-only so listeners are never duplicated on iOS.
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    const openUrl = App.addListener("appUrlOpen", ({ url }) => {
      const target = widgetRoute(url);
      if (!target) return;
      if (target.silo) setSilo(target.silo);
      navigate(target.path);
    });
    const state = App.addListener("appStateChange", ({ isActive }) => {
      window.dispatchEvent(new CustomEvent(isActive ? "bfportal:native-resume" : "bfportal:native-background"));
    });
    const resume = App.addListener("resume", () => {
      window.dispatchEvent(new CustomEvent("bfportal:native-resume"));
    });
    const back = App.addListener("backButton", ({ canGoBack }) => {
          const overlay = document.querySelector<HTMLElement>('[role="dialog"], [aria-modal="true"], [data-state="open"]');
          if (overlay) {
            overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            window.dispatchEvent(new CustomEvent("bfportal:native-back-overlay"));
            return;
          }
          if (canGoBack && !ROOT_PATHS.has(pathname.current)) navigate(-1);
          else if (ROOT_PATHS.has(pathname.current)) void App.exitApp();
        });

    return () => {
      void openUrl.then((handle) => handle.remove());
      void state.then((handle) => handle.remove());
      void resume.then((handle) => handle.remove());
      void back.then((handle) => handle.remove());
    };
  }, [navigate, setSilo]);

  return null;
}
