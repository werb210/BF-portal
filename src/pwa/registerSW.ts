import { Workbox } from "workbox-window";

let wb: Workbox | null = null;

export function registerPortalSW(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;
  // BF_PORTAL_DESKTOP_FRESH_v761 - the Windows/Mac desktop app is always online and never closes; an offline cache there
  // only pins an old build. Remove any cache left from before and do not install one.
  if ((window as unknown as { borealDesktop?: unknown }).borealDesktop) {
    void navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch((err) => console.warn("[bf-portal] could not remove the desktop app's old cache:", err));
    if (typeof caches !== "undefined") void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => undefined);
    return;
  }
  wb = new Workbox("/sw.js", { scope: "/" });
  wb.addEventListener("waiting", () => {
    window.dispatchEvent(new CustomEvent("bf:sw-update-available"));
  });
  wb.addEventListener("controlling", () => { window.location.reload(); });
  wb.register().catch((err) => {
    console.warn("[bf-portal] service worker registration failed:", err);
  });
}

export function applyPortalSWUpdate(): void {
  if (!wb) return;
  wb.messageSkipWaiting();
}
