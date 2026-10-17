// BF_PORTAL_v817_IPAD_VOIP - the native VoIP wrapper is a no-op on web and Android, and the
// "does the JS Device register for incoming calls" decision keeps the iPad from ringing twice.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  platform: "web" as string,
  pluginAvailable: false,
  register: vi.fn(),
  unregister: vi.fn(async () => {}),
  addListener: vi.fn(async () => ({ remove: vi.fn(async () => {}) })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => h.platform,
    isPluginAvailable: (name: string) => name === "BorealVoice" && h.pluginAvailable,
  },
  registerPlugin: () => ({ register: h.register, unregister: h.unregister, addListener: h.addListener }),
}));

import { jsDeviceRegistersForIncoming, portalVoip, PORTAL_VOIP_APP } from "@/native/portalVoip";

beforeEach(() => {
  h.platform = "web";
  h.pluginAvailable = false;
  h.register.mockReset().mockResolvedValue({ registered: true });
  h.unregister.mockClear();
  h.addListener.mockClear();
});

describe("jsDeviceRegistersForIncoming", () => {
  it("web and Android: the JS Device registers for incoming calls as before", () => {
    expect(jsDeviceRegistersForIncoming({ platform: "web", pluginAvailable: false, nativeRegistered: false })).toBe(true);
    expect(jsDeviceRegistersForIncoming({ platform: "android", pluginAvailable: false, nativeRegistered: false })).toBe(true);
    // a stray "registered" flag off iOS never turns it off
    expect(jsDeviceRegistersForIncoming({ platform: "web", pluginAvailable: true, nativeRegistered: true })).toBe(true);
  });

  it("iPad app with native VoIP registered: the JS Device does not register (no double ring)", () => {
    expect(jsDeviceRegistersForIncoming({ platform: "ios", pluginAvailable: true, nativeRegistered: true })).toBe(false);
  });

  it("iPad app whose native registration failed, or an older build without the plugin: JS Device keeps ringing", () => {
    expect(jsDeviceRegistersForIncoming({ platform: "ios", pluginAvailable: true, nativeRegistered: false })).toBe(true);
    expect(jsDeviceRegistersForIncoming({ platform: "ios", pluginAvailable: false, nativeRegistered: false })).toBe(true);
  });
});

describe("portalVoip wrapper", () => {
  it("names the portal app for the voice token", () => {
    expect(PORTAL_VOIP_APP).toBe("portal-ios");
  });

  it("is a no-op on web and Android", async () => {
    for (const p of ["web", "android"]) {
      h.platform = p;
      expect(portalVoip.available()).toBe(false);
      expect(await portalVoip.register("tok")).toBe(false);
      await portalVoip.unregister();
      portalVoip.onCallStateChanged(() => {})();
    }
    expect(h.register).not.toHaveBeenCalled();
    expect(h.unregister).not.toHaveBeenCalled();
    expect(h.addListener).not.toHaveBeenCalled();
  });

  it("on the iPad app passes the token to the native plugin and reports the result", async () => {
    h.platform = "ios";
    h.pluginAvailable = true;
    expect(await portalVoip.register("tok")).toBe(true);
    expect(h.register).toHaveBeenCalledWith({ accessToken: "tok" });
    h.register.mockResolvedValueOnce({ registered: false, error: "no_voip_device_token" });
    expect(await portalVoip.register("tok")).toBe(false);
    h.register.mockRejectedValueOnce(new Error("plugin gone"));
    expect(await portalVoip.register("tok")).toBe(false);
    expect(await portalVoip.register("")).toBe(false);
    await portalVoip.unregister();
    expect(h.unregister).toHaveBeenCalledTimes(1);
  });

  it("forwards callStateChanged events", async () => {
    h.platform = "ios";
    h.pluginAvailable = true;
    const cb = vi.fn();
    const off = portalVoip.onCallStateChanged(cb);
    expect(h.addListener).toHaveBeenCalledWith("callStateChanged", cb);
    off();
  });
});
