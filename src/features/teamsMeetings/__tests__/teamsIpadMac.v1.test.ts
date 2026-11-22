// BF_PORTAL_TEAMS_IPAD_SIGNIN_v1 / BF_PORTAL_TEAMS_MAC_v1 / BF_PORTAL_TEAMS_BLUR_v1
import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";

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

describe("Teams sign-in in the iPad / Mac app", () => {
  beforeEach(() => { sessionStorage.clear(); native.on = true; });

  // BF_PORTAL_TEAMS_NATIVE_NO_SIGNIN_v1 - a sign-in would leave the app for Safari; the server uses the stored sign-in.
  it("never opens a Microsoft sign-in, by redirect or popup", async () => {
    const c = consent();
    expect(await teamsIdentityToken(c, { interactive: true, join })).toBeNull();
    expect(c.acquireTokenRedirect).not.toHaveBeenCalled();
    expect(c.acquireTokenPopup).not.toHaveBeenCalled();
    expect(readPendingJoin()).toBeNull();
  });

  it("drops a meeting remembered by an older build", () => {
    sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify({ ...join, at: Date.now() }));
    expect(readPendingJoin()).toBeNull();
    expect(sessionStorage.getItem(PENDING_JOIN_KEY)).toBeNull();
  });
});

describe("Teams sign-in where popups cannot open (Safari on iPad)", () => {
  const ua = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");
  beforeEach(() => {
    sessionStorage.clear();
    native.on = false;
    Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  });
  afterAll(() => { if (ua) Object.defineProperty(window.navigator, "userAgent", ua); else delete (window.navigator as any).userAgent; });

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
    Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/157.0" });
    const c = consent();
    expect(await teamsIdentityToken(c, { interactive: true, join })).toBe("popup");
    expect(c.acquireTokenRedirect).not.toHaveBeenCalled();
  });
});
