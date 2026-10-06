// BF_PORTAL_DESKTOP_NOTIFY_v753
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useNotificationsStore } from "@/state/notifications.store";
import DesktopBridge, { desktopNotificationText } from "../DesktopBridge";

const shown: Array<{ title: string; opts: any }> = [];
class FakeNotification { static permission = "granted"; onclick: (() => void) | null = null; constructor(title: string, opts: any) { shown.push({ title, opts }); } }

beforeEach(() => {
  shown.length = 0;
  (window as any).Notification = FakeNotification;
  (window as any).borealDesktop = { incomingCall: vi.fn(), setBadge: vi.fn() };
  useNotificationsStore.setState({ notifications: [] } as any);
});

describe("server notifications show in the desktop app", () => {
  it("a new unread notification raises a native notification once", () => {
    render(<DesktopBridge />);
    const item = { id: "n1", type: "system_alert", title: "", message: "You have a new message in your inbox.", createdAt: Date.now(), read: false, source: "server", url: "/communications" };
    act(() => { useNotificationsStore.setState({ notifications: [item] } as any); });
    act(() => { useNotificationsStore.setState({ notifications: [{ ...item }] } as any); });
    expect(shown).toHaveLength(1);
    expect(shown[0]!.opts.body).toBe("You have a new message in your inbox.");
  });
  it("old notifications from before the app opened and read ones are not replayed", () => {
    render(<DesktopBridge />);
    act(() => { useNotificationsStore.setState({ notifications: [
      { id: "old", type: "system_alert", title: "Old", message: "x", createdAt: Date.now() - 60 * 60_000, read: false, source: "server" },
      { id: "read", type: "system_alert", title: "Read", message: "x", createdAt: Date.now(), read: true, source: "server" },
    ] } as any); });
    expect(shown).toHaveLength(0);
  });
  it("does nothing in a normal browser (Chrome gets these by push)", () => {
    delete (window as any).borealDesktop;
    render(<DesktopBridge />);
    act(() => { useNotificationsStore.setState({ notifications: [{ id: "n2", type: "system_alert", title: "Hi", message: "x", createdAt: Date.now(), read: false, source: "server" }] } as any); });
    expect(shown).toHaveLength(0);
  });
  it("gives untitled server notifications a title", () => {
    expect(desktopNotificationText({ title: "", message: "Body", type: "system_alert" })).toEqual({ title: "Boreal Staff Portal", body: "Body" });
    expect(desktopNotificationText({ title: "New email", message: "Body" }).title).toBe("New email");
  });
});
