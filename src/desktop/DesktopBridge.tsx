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

export default function DesktopBridge() {
  const incoming = useDialer((s) => s.incoming);
  const unread = useNotificationsStore((s) => s.notifications.filter((n) => !n.read).length);
  const announced = useRef<unknown>(null);

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

  return null;
}
