// BF_PORTAL_v868_SLIDING_REFRESH - the portal renews the staff session while it is in use: it trades the refresh
// token for a new access token and a new refresh token when the access token is 12 hours old or near expiry.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureRefreshToken, refreshSessionNow, revokeRefreshOnSignOut, shouldRefresh, startSessionRefresh, tokenTimes,
} from "@/auth/sessionRefresh";
import { clearAuthToken, getAuthToken, getRefreshToken, setAuthToken, setRefreshToken } from "@/lib/authToken";

const HOUR = 3600 * 1000;
const NOW = Date.UTC(2026, 10, 4, 15, 0, 0);

function jwt(iatMs: number, expMs: number): string {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${enc({ alg: "HS256" })}.${enc({ sub: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", iat: iatMs / 1000, exp: expMs / 1000 })}.sig`;
}

function reply(status: number, body: unknown = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

describe("sliding session refresh", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads iat and exp from the access token", () => {
    expect(tokenTimes(jwt(NOW, NOW + 7 * 24 * HOUR))).toEqual({ iat: NOW, exp: NOW + 7 * 24 * HOUR });
    expect(tokenTimes("not-a-jwt")).toBeNull();
  });

  it("refreshes only with a refresh token, once the access token is 12 hours old or nearly expired", () => {
    const fresh = jwt(NOW - HOUR, NOW + 7 * 24 * HOUR - HOUR);
    expect(shouldRefresh(fresh, null, NOW)).toBe(false);
    expect(shouldRefresh(fresh, "srt_x", NOW)).toBe(false);
    expect(shouldRefresh(jwt(NOW - 13 * HOUR, NOW + 6 * 24 * HOUR), "srt_x", NOW)).toBe(true);
    expect(shouldRefresh(jwt(NOW - HOUR, NOW + 24 * HOUR), "srt_x", NOW)).toBe(true);
    expect(shouldRefresh(null, "srt_x", NOW)).toBe(true);
  });

  it("keeps the refresh token a sign-in returns", () => {
    captureRefreshToken({ status: "ok", data: { token: "t", refreshToken: "srt_from_sign_in" } });
    expect(getRefreshToken()).toBe("srt_from_sign_in");
    captureRefreshToken({ data: { token: "t" } });
    expect(getRefreshToken()).toBe("srt_from_sign_in");
  });

  it("swaps in the new access token and the rotated refresh token", async () => {
    setAuthToken(jwt(NOW - 13 * HOUR, NOW + 6 * 24 * HOUR));
    setRefreshToken("srt_old");
    const next = jwt(NOW, NOW + 7 * 24 * HOUR);
    const fetchImpl = reply(200, { status: "ok", data: { token: next, refreshToken: "srt_new" } });
    expect(await refreshSessionNow({ fetchImpl, now: NOW })).toBe("refreshed");
    expect(getAuthToken()).toBe(next);
    expect(getRefreshToken()).toBe("srt_new");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/auth\/refresh$/);
    expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "srt_old" });
  });

  it("does nothing while the access token is fresh", async () => {
    setAuthToken(jwt(NOW - HOUR, NOW + 6 * 24 * HOUR));
    setRefreshToken("srt_old");
    const fetchImpl = reply(200, {});
    expect(await refreshSessionNow({ fetchImpl, now: NOW })).toBe("not_needed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("a refused refresh forgets the refresh token and leaves the access token to run out", async () => {
    const access = jwt(NOW - 13 * HOUR, NOW + 6 * 24 * HOUR);
    setAuthToken(access);
    setRefreshToken("srt_old");
    expect(await refreshSessionNow({ fetchImpl: reply(401, { error: "refresh_invalid" }), now: NOW })).toBe("signed_out");
    expect(getRefreshToken()).toBeNull();
    expect(getAuthToken()).toBe(access);
  });

  it("another tab refreshing at the same moment is not an error", async () => {
    setAuthToken(jwt(NOW - 13 * HOUR, NOW + 6 * 24 * HOUR));
    setRefreshToken("srt_old");
    expect(await refreshSessionNow({ fetchImpl: reply(409), now: NOW })).toBe("busy");
    expect(getRefreshToken()).toBe("srt_old");
  });

  it("a network failure keeps everything as it was", async () => {
    setAuthToken(jwt(NOW - 13 * HOUR, NOW + 6 * 24 * HOUR));
    setRefreshToken("srt_old");
    const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); });
    expect(await refreshSessionNow({ fetchImpl, now: NOW })).toBe("failed");
    expect(getRefreshToken()).toBe("srt_old");
  });

  it("signing out revokes the chain on the server and forgets the refresh token", () => {
    setAuthToken(jwt(NOW, NOW + HOUR));
    setRefreshToken("srt_live");
    const fetchImpl = reply(204);
    revokeRefreshOnSignOut(fetchImpl);
    expect(getRefreshToken()).toBeNull();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/auth\/refresh\/revoke$/);
    expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "srt_live" });
    setRefreshToken("srt_again");
    clearAuthToken();
    expect(getRefreshToken()).toBeNull();
  });

  it("checks on start and again every 15 minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    setAuthToken(jwt(NOW - HOUR, NOW + 6 * 24 * HOUR));
    setRefreshToken("srt_old");
    const fetchImpl = reply(200, { data: { token: jwt(NOW + 12 * HOUR, NOW + 7 * 24 * HOUR), refreshToken: "srt_new" } });
    const stop = startSessionRefresh({ fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(12 * HOUR);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    stop();
  });
});
