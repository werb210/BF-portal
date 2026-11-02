// BF_PORTAL_v864_NATIVE_PASSKEYS - in the iPad app (also on a Mac, "Designed for iPad") passkeys use the native plugin,
// so the passkey option shows even though the web view has no usable WebAuthn.
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  native: true,
  platform: "ios",
  pluginAvailable: true,
  plugin: { status: vi.fn(), register: vi.fn(), authenticate: vi.fn() },
  webauthn: false,
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
  apiPost: vi.fn(),
  setAuthToken: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => h.platform, isPluginAvailable: (n: string) => n === "NativePasskey" && h.pluginAvailable },
  registerPlugin: () => h.plugin,
}));
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => h.webauthn, startAuthentication: h.startAuthentication, startRegistration: h.startRegistration }));
vi.mock("@/api", () => ({ api: { post: h.apiPost } }));
vi.mock("@/lib/authToken", () => ({ setAuthToken: h.setAuthToken }));

import { loginWithPasskey, passkeysSupported, registerPasskey } from "../passkey";

describe("native passkeys (v864)", () => {
  beforeEach(() => {
    h.native = true; h.platform = "ios"; h.pluginAvailable = true; h.webauthn = false;
    Object.values(h.plugin).forEach((f) => f.mockReset());
    h.startAuthentication.mockReset(); h.startRegistration.mockReset(); h.apiPost.mockReset(); h.setAuthToken.mockReset();
  });

  it("shows passkeys in the iPad app and the Mac 'Designed for iPad' app although the web view has no WebAuthn", () => {
    expect(passkeysSupported()).toBe(true);
    h.pluginAvailable = false; // an older build without the plugin
    expect(passkeysSupported()).toBe(false);
    h.native = false; h.webauthn = true; // a browser
    expect(passkeysSupported()).toBe(true);
  });

  it("signs in through the native plugin with the server's options and posts its answer", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ challenge: "Y2hhbA", rpId: "staff.boreal.financial", allowCredentials: [{ id: "Y3JlZA", type: "public-key" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { token: "jwt-1" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    h.plugin.authenticate.mockResolvedValue({ id: "Y3JlZA", rawId: "Y3JlZA", type: "public-key", response: { clientDataJSON: "x", authenticatorData: "y", signature: "z" } });
    await loginWithPasskey();
    expect(h.plugin.authenticate).toHaveBeenCalledWith({ rpId: "staff.boreal.financial", challenge: "Y2hhbA", allowCredentials: [{ id: "Y3JlZA" }] });
    expect(h.startAuthentication).not.toHaveBeenCalled();
    const sent = (fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>)[1];
    expect(JSON.parse(String(sent?.[1]?.body)).id).toBe("Y3JlZA");
    expect(h.setAuthToken).toHaveBeenCalledWith("jwt-1");
    vi.unstubAllGlobals();
  });

  it("registers through the native plugin; a cancel reads as NotAllowedError", async () => {
    h.apiPost.mockImplementation(async (url: string) => url.endsWith("/options")
      ? { challenge: "Y2g", rp: { id: "staff.boreal.financial", name: "Boreal Financial" }, user: { id: "dXNlcg", name: "todd@example.com" }, excludeCredentials: [{ id: "b2xk" }] }
      : { ok: true });
    h.plugin.register.mockResolvedValue({ id: "bmV3", response: { clientDataJSON: "a", attestationObject: "b" } });
    await registerPasskey();
    expect(h.plugin.register).toHaveBeenCalledWith({ rpId: "staff.boreal.financial", challenge: "Y2g", userId: "dXNlcg", userName: "todd@example.com", excludeCredentials: [{ id: "b2xk" }] });
    expect(h.apiPost).toHaveBeenCalledWith("/api/webauthn/register/verify", expect.objectContaining({ id: "bmV3" }));
    h.plugin.register.mockRejectedValue({ code: "cancelled", message: "Passkey cancelled." });
    await expect(registerPasskey()).rejects.toMatchObject({ name: "NotAllowedError" });
  });
});
