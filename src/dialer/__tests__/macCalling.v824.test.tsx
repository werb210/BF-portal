// BF_PORTAL_v824_NATIVE_OUTGOING - the portal app on a Mac has no microphone in its web page, so calls are placed
// by the app itself; the iPad, iPhone and browsers keep calling from the web page.
import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  platform: "ios" as string,
  pluginAvailable: true,
  connect: vi.fn(async (_o: any) => ({ started: true } as { started: boolean; error?: string })),
  sendDigits: vi.fn(async (_o: any) => {}),
  hangup: vi.fn(async () => {}),
  startCall: vi.fn(async (_b: any) => ({ data: { ok: true, conferenceFriendly: "conf-1" } } as any)),
  voiceTokenFor: vi.fn(async () => ({ data: { token: "tok-portal" } })),
}));

vi.mock("@capacitor/app", () => ({ App: { addListener: async () => ({ remove: async () => {} }) } }));
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => h.platform,
    isNativePlatform: () => h.platform !== "web",
    isPluginAvailable: (name: string) => name === "BorealVoice" && h.pluginAvailable,
  },
  registerPlugin: () => ({
    connect: h.connect,
    sendDigits: h.sendDigits,
    hangup: h.hangup,
    mute: vi.fn(async ({ muted }: { muted: boolean }) => ({ muted })),
    speaker: vi.fn(async ({ on }: { on: boolean }) => ({ speaker: on })),
    getState: vi.fn(async () => ({})),
    addListener: async () => ({ remove: async () => {} }),
  }),
}));
vi.mock("@/dialer/api", () => ({
  dialerApi: { startCall: h.startCall, voiceTokenFor: h.voiceTokenFor, voiceToken: vi.fn(async () => ({ data: { token: "tok-web" } })) },
}));
vi.mock("@/native/dialerLauncher", () => ({ launchNativeBorealDialer: vi.fn(async () => false) }));
vi.mock("@/dialer/debugRing", () => ({ ringPush: vi.fn() }));

import { callsNatively, nativeCallParams, shouldCallNatively } from "../nativeVoice";
import { hangup, joinMeetingRoom, sendPanelDigits, startOutboundPstn } from "../actions";
import { useDialer } from "../store";
import NativeCallBanner from "../components/NativeCallBanner";

const realMediaDevices = (navigator as any).mediaDevices;
function setWebMic(on: boolean) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: on ? { getUserMedia: vi.fn(async () => ({ getTracks: () => [] })) } : undefined,
  });
}

beforeEach(() => {
  h.platform = "ios";
  h.pluginAvailable = true;
  h.connect.mockClear();
  h.connect.mockImplementation(async () => ({ started: true }));
  h.startCall.mockClear();
  h.sendDigits.mockClear();
  useDialer.getState().reset();
  setWebMic(false);
});
afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: realMediaDevices });
});

describe("calls from the portal app on a Mac", () => {
  it("calls natively only in the app when the page has no microphone", () => {
    expect(shouldCallNatively({ native: true, webMic: false })).toBe(true);
    expect(shouldCallNatively({ native: true, webMic: true })).toBe(false);
    expect(shouldCallNatively({ native: false, webMic: false })).toBe(false);
    expect(callsNatively()).toBe(true);
    setWebMic(true);
    expect(callsNatively()).toBe(false); // the iPad
    h.pluginAvailable = false;
    setWebMic(false);
    expect(callsNatively()).toBe(false); // a browser
  });

  it("keeps only non-empty text parameters", () => {
    expect(nativeCallParams({ To: "+14035550100", conferenceFriendly: undefined, meetingSlug: "", n: 5 }))
      .toEqual({ To: "+14035550100", n: "5" });
  });

  it("places a phone call through the app after the same server setup", async () => {
    await startOutboundPstn("(403) 555-0100", { contactName: "Jane Client", contactId: "c1" });
    expect(h.startCall).toHaveBeenCalledWith(expect.objectContaining({ to: "+14035550100", contactId: "c1", silo: "BF" }));
    expect(h.connect).toHaveBeenCalledWith({ accessToken: "tok-portal", params: { conferenceFriendly: "conf-1", To: "+14035550100" } });
    const st = useDialer.getState();
    expect(st.nativeCall).toEqual(expect.objectContaining({ from: "+14035550100", callerName: "Jane Client", phase: "connecting", fromPanel: true }));
    // BF_PORTAL_v844_MAC_DIALER_PANEL - the dialer panel stays open and shows the call (v824 closed it).
    expect(st.isOpen).toBe(true);
    expect(st.status).toBe("ringing");
    expect(st.error).toBeNull();
  });

  it("shows why the app could not start the call", async () => {
    h.connect.mockImplementation(async () => ({ started: false, error: "mic_permission_denied" }));
    await startOutboundPstn("4035550100");
    const st = useDialer.getState();
    expect(st.status).toBe("error");
    expect(st.error).toBe("mic_permission_denied");
    expect(st.isOpen).toBe(true);
    expect(st.nativeCall).toBeNull();
  });

  it("joins a meeting room through the app", async () => {
    await joinMeetingRoom("weekly", "Weekly");
    expect(h.connect).toHaveBeenCalledWith(expect.objectContaining({ params: { meetingSlug: "weekly" } }));
    expect(h.startCall).not.toHaveBeenCalled();
  });

  it("leaves the iPad calling from the web page", async () => {
    setWebMic(true);
    await startOutboundPstn("4035550100");
    expect(h.connect).not.toHaveBeenCalled();
    expect(useDialer.getState().error).toBe("device_not_initialized");
  });

  it("has a keypad on the call banner for phone menus", async () => {
    act(() => { useDialer.getState().setNativeCall({ from: "+14035550100", phase: "connected" }); });
    render(<NativeCallBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Keypad" }));
    fireEvent.click(screen.getByRole("button", { name: "Key 5" }));
    expect(h.sendDigits).toHaveBeenCalledWith({ digits: "5" });
  });

  // BF_PORTAL_v844_MAC_DIALER_PANEL
  it("a call placed from the panel shows in the panel, not the top banner", async () => {
    act(() => { useDialer.getState().setNativeCall({ from: "+14035550100", phase: "connected", fromPanel: true }); });
    render(<NativeCallBanner />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("the panel's hang up and keypad drive the app's call", async () => {
    await startOutboundPstn("4035550100");
    expect(sendPanelDigits("7")).toBe(true);
    expect(h.sendDigits).toHaveBeenCalledWith({ digits: "7" });
    h.hangup.mockClear();
    await hangup();
    expect(h.hangup).toHaveBeenCalledTimes(1);
    expect(useDialer.getState().status).toBe("ready");
  });

  it("incoming calls on the iPad keep the banner", () => {
    act(() => { useDialer.getState().setNativeCall({ from: "+14035550100", phase: "connected" }); });
    render(<NativeCallBanner />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(sendPanelDigits("1")).toBe(false);
  });
});
