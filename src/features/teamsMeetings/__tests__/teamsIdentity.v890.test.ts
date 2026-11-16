// BF_PORTAL_v890_TEAMS_IDENTITY - the Microsoft token for Azure Communication Services, silent only.
import { describe, expect, it, vi } from "vitest";
import { ACS_TEAMS_SCOPES, teamsIdentityToken, teamsUserId, inAppVideoSupported } from "../teamsMeetingApi";

describe("Teams identity token", () => {
  it("asks Microsoft silently for the ACS Teams scopes", async () => {
    const acquireTokenSilent = vi.fn(async () => ({ accessToken: "aad-token" }));
    const client = { getActiveAccount: () => ({ username: "alex@boreal.example" }), getAllAccounts: () => [], acquireTokenSilent };
    expect(await teamsIdentityToken(client)).toBe("aad-token");
    expect(acquireTokenSilent).toHaveBeenCalledWith({ account: { username: "alex@boreal.example" }, scopes: ACS_TEAMS_SCOPES });
  });
  it("returns nothing when not signed in to Microsoft or the permission is not granted", async () => {
    expect(await teamsIdentityToken({ getActiveAccount: () => null, getAllAccounts: () => [], acquireTokenSilent: vi.fn() })).toBeNull();
    expect(await teamsIdentityToken({ getActiveAccount: () => ({}), getAllAccounts: () => [], acquireTokenSilent: async () => { throw new Error("consent_required"); } })).toBeNull();
  });

  // BF_PORTAL_v962_TEAMS_JOIN_AS_YOURSELF
  it("from the Join click, a Microsoft window is used when the silent request cannot work", async () => {
    const acquireTokenPopup = vi.fn(async () => ({ accessToken: "aad-popup", account: { username: "alex@boreal.example" } }));
    const setActiveAccount = vi.fn();
    const noSession = { getActiveAccount: () => null, getAllAccounts: () => [], setActiveAccount, acquireTokenSilent: vi.fn(), acquireTokenPopup };
    expect(await teamsIdentityToken(noSession, { interactive: true })).toBe("aad-popup");
    expect(acquireTokenPopup).toHaveBeenCalledWith({ scopes: ACS_TEAMS_SCOPES, account: undefined });
    expect(setActiveAccount).toHaveBeenCalledWith({ username: "alex@boreal.example" });
    expect(noSession.acquireTokenSilent).not.toHaveBeenCalled();

    const consent = { getActiveAccount: () => ({ username: "a" }), getAllAccounts: () => [], acquireTokenSilent: async () => { throw new Error("consent_required"); }, acquireTokenPopup };
    expect(await teamsIdentityToken(consent, { interactive: true })).toBe("aad-popup");
    expect(await teamsIdentityToken(consent)).toBeNull(); // not from a click: no window
    const closed = { ...consent, acquireTokenPopup: async () => { throw new Error("user_cancelled"); } };
    expect(await teamsIdentityToken(closed, { interactive: true })).toBeNull();
  });

  // BF_PORTAL_v963_TEAMS_USER_ID + BF_PORTAL_v963_NO_WEBRTC
  it("remembers whose token it is, and knows when in-app video cannot run", async () => {
    const OID = "44444444-4444-4444-8444-444444444444";
    const client = { getActiveAccount: () => ({ username: "a", localAccountId: OID }), getAllAccounts: () => [], acquireTokenSilent: async () => ({ accessToken: "t" }) };
    expect(await teamsIdentityToken(client)).toBe("t");
    expect(teamsUserId()).toBe(OID);
    expect(inAppVideoSupported({})).toBe(false);
    expect(inAppVideoSupported({ MediaStream: class {}, RTCPeerConnection: class {} })).toBe(true);
  });
});
