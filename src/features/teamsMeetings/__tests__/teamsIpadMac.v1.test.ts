// BF_PORTAL_TEAMS_IPAD_SIGNIN_v1 / BF_PORTAL_TEAMS_MAC_v1 / BF_PORTAL_TEAMS_BLUR_v1
import { describe, expect, it, vi, beforeEach } from "vitest";

const native = vi.hoisted(() => ({ on: true }));
vi.mock("@capacitor/core", () => ({ registerPlugin: () => ({}), Capacitor: { isNativePlatform: () => native.on, getPlatform: () => "ios", isPluginAvailable: () => false } }));

import { ACS_TEAMS_SCOPES, PENDING_JOIN_KEY, teamsIdentityToken, readPendingJoin, popupUnusable } from "../teamsMeetingApi";

const join = { joinUrl: "https://teams.microsoft.com/l/meetup-join/abc", meetingId: null, calendarEventId: null };
const consent = () => ({
  getActiveAccount: () => ({ username: "todd@boreal.financial" }), getAllAccounts: () => [],
  acquireTokenSilent: async () => { throw new Error("consent_required"); },
  acquireTokenPopup: vi.fn(async () => ({ accessToken: "popup" })),
  acquireTokenRedirect: vi.fn(async () => undefined),
});

describe("Teams sign-in where popups cannot open (iPad app)", () => {
  beforeEach(() => { sessionStorage.clear(); native.on = true; });

  it("uses a redirect, remembers the meeting, and never the popup", async () => {
    expect(popupUnusable()).toBe(true);
    const c = consent();
    expect(await teamsIdentityToken(c, { interactive: true, join })).toBeNull();
    expect(c.acquireTokenRedirect).toHaveBeenCalledWith({ scopes: ACS_TEAMS_SCOPES, account: { username: "todd@boreal.financial" } });
    expect(c.acquireTokenPopup).not.toHaveBeenCalled();
    expect(readPendingJoin()?.joinUrl).toBe(join.joinUrl);
  });

  it("tries the redirect only once per meeting, so a refused sign-in cannot loop", async () => {
    const c = consent();
    await teamsIdentityToken(c, { interactive: true, join });
    await teamsIdentityToken(c, { interactive: true, join });
    expect(c.acquireTokenRedirect).toHaveBeenCalledTimes(1);
  });

  it("a remembered meeting expires after 10 minutes", () => {
    sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify({ ...join, at: Date.now() - 11 * 60 * 1000 }));
    expect(readPendingJoin()).toBeNull();
  });

  it("in a normal browser the popup is still used", async () => {
    native.on = false;
    const c = consent();
    expect(await teamsIdentityToken(c, { interactive: true, join })).toBe("popup");
    expect(c.acquireTokenRedirect).not.toHaveBeenCalled();
  });
});
