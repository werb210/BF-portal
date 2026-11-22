// BF_PORTAL_v_TEAMS_SHARE_SUPPORT
import { afterEach, describe, expect, it, vi } from "vitest";
import { screenShareSupported } from "../screenShare";

function nav(ua: string, touch: number, gdm: boolean) {
  vi.stubGlobal("navigator", { userAgent: ua, maxTouchPoints: touch, mediaDevices: gdm ? { getDisplayMedia: () => null } : {} });
}
afterEach(() => vi.unstubAllGlobals());

describe("screen share button", () => {
  it("is hidden on the iPad app", () => {
    nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5, true);
    expect(screenShareSupported()).toBe(false);
  });
  it("is hidden when the browser cannot share", () => {
    nav("Mozilla/5.0 (Windows NT 10.0) Chrome/130", 0, false);
    expect(screenShareSupported()).toBe(false);
  });
  it("shows on a desktop browser", () => {
    nav("Mozilla/5.0 (Windows NT 10.0) Chrome/130", 0, true);
    expect(screenShareSupported()).toBe(true);
  });
});
