// BF_PORTAL_DESKTOP_ALERTS_v724 - tells the Windows/Mac desktop app (desktop/preload.cjs
// exposes window.borealDesktop) about an incoming call, so it can bring the window to
// the front with a pop-up showing the caller, and keeps the taskbar/dock badge at the
// number of unread notifications. In a normal browser window.borealDesktop does not
// exist and this does nothing.
import { useEffect, useRef } from "react";
import { useDialer } from "@/dialer/store";
import { useNotificationsStore } from "@/state/notifications.store";

type DesktopApi = { incomingCall(info: { name: string; detail: string }): void; setBadge(count: number): void };
const desktop = (): DesktopApi | null => ((window as unknown as { borealDesktop?: DesktopApi }).borealDesktop ?? null);

export function callerLabel(incoming: { fromDisplay?: string | null; companyName?: string | null; applicationName?: string | null; phone?: string | null }): { name: string; detail: string } {
  const name = String(incoming.fromDisplay || incoming.phone || "Incoming call");
  const detail = [incoming.companyName, incoming.applicationName].filter((v) => v && String(v).trim() && v !== name).join(" - ");
  return { name, detail: detail || "Incoming call" };
}

// BF_PORTAL_DESKTOP_NOTIFY_v753 - the desktop app (Electron) has no Web Push service, so email alerts and every other
// server notification that reaches Chrome by push never reached the Mac/Windows app. The portal already polls those
// notifications into its list; in the desktop app each NEW unread one now raises a native notification. Older items
// (from before the app opened) are not replayed. Clicking it brings the window forward and opens the item's page.
export const DESKTOP_NOTIFY_LOOKBACK_MS = 2 * 60_000;
export function desktopNotificationText(n: { title?: string; message?: string; type?: string }): { title: string; body: string } {
  const title = String(n.title || "").trim() || (n.type === "new_message" ? "New message" : "Boreal Staff Portal");
  return { title, body: String(n.message || "").trim() };
}
function raiseDesktopNotification(n: { id: string; title?: string; message?: string; type?: string; url?: string }) {
  const N = (window as unknown as { Notification?: any }).Notification;
  if (!N) return;
  const show = () => {
    const { title, body } = desktopNotificationText(n);
    const note = new N(title, { body, tag: "boreal-" + n.id });
    note.onclick = () => {
      try { window.focus(); } catch { /* ignore */ }
      if (n.url && n.url.startsWith("/")) { window.history.pushState({}, "", n.url); window.dispatchEvent(new PopStateEvent("popstate")); }
    };
  };
  if (N.permission === "granted") show();
  else if (N.permission !== "denied" && typeof N.requestPermission === "function") void Promise.resolve(N.requestPermission()).then((p: string) => { if (p === "granted") show(); });
}

export default function DesktopBridge() {
  const incoming = useDialer((s) => s.incoming);
  const unread = useNotificationsStore((s) => s.notifications.filter((n) => !n.read).length);
  const announced = useRef<unknown>(null);
  const items = useNotificationsStore((s) => s.notifications); // BF_PORTAL_DESKTOP_NOTIFY_v753
  const seen = useRef<Set<string>>(new Set());
  const openedAt = useRef<number>(Date.now());

  useEffect(() => {
    const api = desktop();
    if (!api || !incoming) { if (!incoming) announced.current = null; return; }
    // Announce each call once, after the caller's name has had a moment to resolve.
    if (announced.current === incoming.pendingCall && announced.current) return;
    announced.current = incoming.pendingCall ?? incoming;
    try { api.incomingCall(callerLabel(incoming)); } catch { /* desktop app older than this page */ }
  }, [incoming]);

  useEffect(() => {
    try { desktop()?.setBadge(unread); } catch { /* desktop app older than this page */ }
  }, [unread]);

  // BF_PORTAL_DESKTOP_NOTIFY_v753
  useEffect(() => {
    if (!desktop()) return;
    for (const n of items) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read || !(Number(n.createdAt) >= openedAt.current - DESKTOP_NOTIFY_LOOKBACK_MS)) continue;
      try { raiseDesktopNotification(n); } catch { /* notifications unavailable */ }
    }
  }, [items]);

  return null;
}
