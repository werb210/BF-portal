// BF_PORTAL_DESKTOP_ALERTS_v724 + BF_PORTAL_BROKER_PIPELINE_v724
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useDialer } from "@/dialer/store";
import { useNotificationsStore } from "@/state/notifications.store";
import DesktopBridge, { callerLabel } from "../DesktopBridge";
import { brokerBadgeLabels } from "@/pages/pipeline/PipelinePage";

const api = { incomingCall: vi.fn(), setBadge: vi.fn() };
beforeEach(() => { api.incomingCall.mockReset(); api.setBadge.mockReset(); (window as any).borealDesktop = api; useDialer.setState({ incoming: null } as any); });

describe("desktop app alerts", () => {
  it("announces an incoming call once, with the caller's name", () => {
    render(<DesktopBridge />);
    const call = { id: 1 };
    act(() => { useDialer.setState({ incoming: { conferenceFriendly: "", fromDisplay: "Jane Smith", companyName: "Acme Ltd", pendingCall: call } } as any); });
    act(() => { useDialer.setState({ incoming: { conferenceFriendly: "", fromDisplay: "Jane Smith", companyName: "Acme Ltd", pendingCall: call } } as any); });
    expect(api.incomingCall).toHaveBeenCalledTimes(1);
    expect(api.incomingCall).toHaveBeenCalledWith({ name: "Jane Smith", detail: "Acme Ltd" });
  });
  it("keeps the badge at the unread count", () => {
    useNotificationsStore.setState({ notifications: [{ id: "a", read: false }, { id: "b", read: true }, { id: "c", read: false }] } as any);
    render(<DesktopBridge />);
    expect(api.setBadge).toHaveBeenLastCalledWith(2);
  });
  it("does nothing in a normal browser", () => {
    delete (window as any).borealDesktop;
    expect(() => render(<DesktopBridge />)).not.toThrow();
  });
  it("labels unknown callers sensibly", () => {
    expect(callerLabel({ fromDisplay: "", phone: "+14035550101" })).toEqual({ name: "+14035550101", detail: "Incoming call" });
  });
  it("the desktop app brings the window forward with a pop-up and shows the badge, for the portal only", () => {
    const main = readFileSync("desktop/main.cjs", "utf8");
    expect(main).toContain('preload: path.join(__dirname, "preload.cjs")');
    expect(main).toContain('ipcMain.on("boreal:incoming-call"');
    expect(main).toContain("if (!isPortalUrl(event.sender.getURL())) return;");
    expect(main).toContain("app.setBadgeCount(n)");
    expect(main).toContain("mainWindow.setOverlayIcon(");
    expect(readFileSync("desktop/preload.cjs", "utf8")).toContain('contextBridge.exposeInMainWorld("borealDesktop"');
    expect(JSON.parse(readFileSync("desktop/package.json", "utf8")).build.files).toContain("preload.cjs");
  });
});

describe("broker files on pipeline cards", () => {
  it("shows who sent it, that it waits for the client, and the split status", () => {
    expect(brokerBadgeLabels({ broker_name: "Avance", pipeline_state: "draft", broker_split_status: null })).toEqual(["From Avance", "Waiting for client", "No split yet"]);
    expect(brokerBadgeLabels({ broker_name: "Avance", pipeline_state: "In Review", broker_split_status: "countered" })).toEqual(["From Avance", "Broker countered"]);
    expect(brokerBadgeLabels({ broker_name: null })).toEqual([]);
  });
});
