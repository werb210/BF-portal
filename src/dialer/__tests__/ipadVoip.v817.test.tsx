// BF_PORTAL_v817_IPAD_VOIP - the iPad app rings natively (PushKit + CallKit) and keeps the Twilio JS
// Device for outgoing calls only; web browsers are unchanged.
import React from "react";
import { render, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  platform: "web" as string,
  pluginAvailable: false,
  register: vi.fn(),
  unregister: vi.fn(async () => {}),
  hangup: vi.fn(async () => {}),
  mute: vi.fn(async ({ muted }: { muted: boolean }) => ({ muted })),
  getState: vi.fn(async () => ({ registered: true, hasDeviceToken: true, muted: false, speaker: false })),
  listeners: {} as Record<string, (d: any) => void>,
  voiceToken: vi.fn(),
  voiceTokenFor: vi.fn(),
  resolveCaller: vi.fn(async () => ({ matched: false })),
  devices: [] as any[],
  auth: { authenticated: true, authStatus: "authenticated" },
  appListeners: {} as Record<string, () => void>,
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: async (event: string, cb: () => void) => {
      h.appListeners[event] = cb;
      return { remove: async () => { delete h.appListeners[event]; } };
    },
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => h.platform,
    isNativePlatform: () => h.platform !== "web",
    isPluginAvailable: (name: string) => name === "BorealVoice" && h.pluginAvailable,
  },
  registerPlugin: () => ({
    register: h.register,
    unregister: h.unregister,
    hangup: h.hangup,
    mute: h.mute,
    speaker: vi.fn(async ({ on }: { on: boolean }) => ({ speaker: on })),
    getState: h.getState,
    addListener: async (event: string, cb: (d: any) => void) => {
      h.listeners[event] = cb;
      return { remove: async () => { delete h.listeners[event]; } };
    },
  }),
}));

vi.mock("@twilio/voice-sdk", () => {
  class FakeDevice {
    state = "unregistered";
    handlers: Record<string, (...a: any[]) => void> = {};
    register = vi.fn(async () => { this.state = "registered"; this.handlers.registered?.(); });
    unregister = vi.fn(async () => { this.state = "unregistered"; });
    updateToken = vi.fn(async () => {});
    destroy = vi.fn();
    connect = vi.fn();
    constructor(public token: string) { h.devices.push(this); }
    on(event: string, cb: (...a: any[]) => void) { this.handlers[event] = cb; return this; }
  }
  return { Device: FakeDevice };
});
vi.mock("@/dialer/api", () => ({
  dialerApi: { voiceToken: h.voiceToken, voiceTokenFor: h.voiceTokenFor, resolveCaller: h.resolveCaller },
}));
vi.mock("@/dialer/sse", () => ({ onSse: () => () => {}, startSse: () => {}, stopSse: () => {} }));
vi.mock("@/dialer/debugRing", () => ({ ringPush: vi.fn() }));
vi.mock("@/auth/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/context/SiloContext", () => ({ useSilo: () => ({ silo: "BF" }) }));

import DialerProvider from "@/dialer/DialerProvider";
import { useDialer } from "@/dialer/store";
import { fetchVoiceToken, stopNativeTokenRefresh, NATIVE_TOKEN_REFRESH_MS, NATIVE_RESUME_MIN_GAP_MS } from "@/dialer/nativeVoice";
import { preflight } from "@/dialer/sanityCheck";
import { nativeVoiceAvailable, nativeCallerLabel } from "@/native/portalVoip";

const flush = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };

beforeEach(() => {
  h.platform = "web";
  h.pluginAvailable = false;
  h.devices = [];
  h.listeners = {};
  h.appListeners = {};
  h.auth = { authenticated: true, authStatus: "authenticated" };
  h.register.mockReset().mockResolvedValue({ registered: true });
  h.unregister.mockClear();
  h.hangup.mockClear();
  h.voiceToken.mockReset().mockResolvedValue({ success: true, data: { token: "web-token" } });
  h.voiceTokenFor.mockReset().mockResolvedValue({ token: "ipad-token", identity: "u1" });
  useDialer.getState().reset();
});
afterEach(() => { cleanup(); stopNativeTokenRefresh(); vi.useRealTimers(); });

describe("platform detection", () => {
  it("only native iOS with the BorealVoice plugin counts", () => {
    expect(nativeVoiceAvailable()).toBe(false);
    h.platform = "ios";
    expect(nativeVoiceAvailable()).toBe(false); // an older iPad build without the plugin
    h.pluginAvailable = true;
    expect(nativeVoiceAvailable()).toBe(true);
    h.platform = "android";
    expect(nativeVoiceAvailable()).toBe(false);
  });
});

describe("web browsers are unchanged", () => {
  it("uses the plain token and registers the JS Device for incoming calls", async () => {
    render(<DialerProvider />);
    await act(flush);
    expect(h.voiceToken).toHaveBeenCalled();
    expect(h.voiceTokenFor).not.toHaveBeenCalled();
    expect(h.register).not.toHaveBeenCalled();
    expect(h.devices).toHaveLength(1);
    expect(h.devices[0].register).toHaveBeenCalledTimes(1);
    expect(useDialer.getState().nativeVoice).toBe(false);
    expect(useDialer.getState().status).toBe("ready");
  });
});

describe("iPad app", () => {
  beforeEach(() => { h.platform = "ios"; h.pluginAvailable = true; });

  it("asks for a portal-ios token, registers natively and never registers the JS Device", async () => {
    render(<DialerProvider />);
    await act(flush);
    expect(h.voiceTokenFor).toHaveBeenCalledWith("portal-ios");
    expect(h.register).toHaveBeenCalledWith({ accessToken: "ipad-token" });
    expect(h.devices).toHaveLength(1);
    expect(h.devices[0].token).toBe("ipad-token");
    expect(h.devices[0].register).not.toHaveBeenCalled();
    expect(useDialer.getState().nativeVoice).toBe(true);
    expect(useDialer.getState().device).toBe(h.devices[0]);
    expect(useDialer.getState().status).toBe("ready");
  });

  it("falls back to the JS Device for incoming calls when native registration fails", async () => {
    h.register.mockResolvedValue({ registered: false, error: "no push credential" });
    render(<DialerProvider />);
    await act(flush);
    expect(h.devices[0].register).toHaveBeenCalledTimes(1);
    expect(useDialer.getState().nativeVoice).toBe(false);
  });

  it("a late native registration takes incoming calls off the JS Device (no double ring)", async () => {
    h.register.mockResolvedValue({ registered: false });
    render(<DialerProvider />);
    await act(flush);
    expect(h.devices[0].state).toBe("registered");
    await act(async () => { h.listeners.registrationChanged?.({ registered: true }); await flush(); });
    expect(h.devices[0].unregister).toHaveBeenCalled();
    expect(useDialer.getState().nativeVoice).toBe(true);
  });

  it("re-registers natively with the refreshed token", async () => {
    h.voiceTokenFor.mockResolvedValueOnce({ token: "ipad-token" }).mockResolvedValueOnce({ token: "ipad-token-2" });
    render(<DialerProvider />);
    await act(flush);
    await act(async () => { await h.devices[0].handlers.tokenWillExpire(); });
    expect(h.devices[0].updateToken).toHaveBeenCalledWith("ipad-token-2");
    expect(h.register).toHaveBeenLastCalledWith({ accessToken: "ipad-token-2" });
  });

  it("hands the native side a fresh token every 50 minutes and on resume (throttled)", async () => {
    let n = 1;
    h.voiceTokenFor.mockImplementation(async () => ({ token: `ipad-token-${n++}` }));
    const t0 = Date.now();
    const now = vi.spyOn(Date, "now").mockReturnValue(t0);
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    render(<DialerProvider />);
    await act(flush);
    expect(h.register).toHaveBeenLastCalledWith({ accessToken: "ipad-token-1" });
    // resume right away: throttled, no new token
    await act(async () => { h.appListeners.resume?.(); await flush(); });
    expect(h.register).toHaveBeenCalledTimes(1);
    now.mockReturnValue(t0 + NATIVE_TOKEN_REFRESH_MS);
    await act(async () => { vi.advanceTimersByTime(NATIVE_TOKEN_REFRESH_MS); await flush(); });
    expect(h.register).toHaveBeenLastCalledWith({ accessToken: "ipad-token-2" });
    expect(h.devices[0].updateToken).toHaveBeenLastCalledWith("ipad-token-2");
    now.mockReturnValue(t0 + NATIVE_TOKEN_REFRESH_MS + NATIVE_RESUME_MIN_GAP_MS);
    await act(async () => { h.appListeners.resume?.(); await flush(); });
    expect(h.register).toHaveBeenLastCalledWith({ accessToken: "ipad-token-3" });
    now.mockRestore();
  });

  it("an older server without app tokens still gets a token", async () => {
    h.voiceTokenFor.mockRejectedValue(new Error("404"));
    expect(await fetchVoiceToken(true)).toBe("web-token");
  });

  it("native call events drive the in-app call state; hang up goes to the plugin", async () => {
    render(<DialerProvider />);
    await act(flush);
    await act(async () => { h.listeners.callIncoming?.({ callSid: "CA1", from: "client:andrew", uuid: "U1" }); });
    expect(useDialer.getState().nativeCall?.phase).toBe("ringing");
    expect(nativeCallerLabel(useDialer.getState().nativeCall)).toBe("andrew");
    await act(async () => { h.listeners.callConnected?.({ callSid: "CA1", from: "client:andrew", uuid: "U1" }); });
    expect(useDialer.getState().nativeCall?.phase).toBe("connected");
    const { nativeHangup, nativeToggleMute } = await import("@/dialer/nativeVoice");
    await nativeToggleMute();
    expect(h.mute).toHaveBeenCalledWith({ muted: true });
    expect(useDialer.getState().nativeCall?.muted).toBe(true);
    await nativeHangup();
    expect(h.hangup).toHaveBeenCalled();
    await act(async () => { h.listeners.callEnded?.({ callSid: "CA1", reason: "ended" }); });
    expect(useDialer.getState().nativeCall).toBeNull();
  });

  it("signing out unregisters this iPad", async () => {
    const view = render(<DialerProvider />);
    await act(flush);
    h.auth = { authenticated: false, authStatus: "unauthenticated" };
    view.rerender(<DialerProvider />);
    await act(flush);
    expect(h.unregister).toHaveBeenCalled();
    expect(useDialer.getState().nativeVoice).toBe(false);
    // the refresh loop stopped with it
    expect(h.appListeners.resume).toBeUndefined();
  });

  it("signing out unregisters even when the native registration had failed", async () => {
    h.register.mockResolvedValue({ registered: false });
    const view = render(<DialerProvider />);
    await act(flush);
    h.auth = { authenticated: false, authStatus: "unauthenticated" };
    view.rerender(<DialerProvider />);
    await act(flush);
    expect(h.unregister).toHaveBeenCalled();
  });

  it("a cold launch that starts signed out does not unregister", async () => {
    h.auth = { authenticated: false, authStatus: "loading" };
    render(<DialerProvider />);
    await act(flush);
    expect(h.unregister).not.toHaveBeenCalled();
  });

  it("outgoing calls are allowed from the unregistered (outgoing-only) Device", async () => {
    const r = await preflight({ state: "unregistered" } as any);
    expect(r.ok === false && r.reason).not.toBe("device_not_registered");
    h.platform = "web";
    const web = await preflight({ state: "unregistered" } as any);
    expect(web.ok === false && web.reason).toBe("device_not_registered");
  });
});
