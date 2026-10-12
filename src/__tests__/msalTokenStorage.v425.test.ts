// BF_PORTAL_MSAL_TOKEN_SECURE_v425
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { setGraphAccessToken, getGraphAccessToken, clearGraphAccessToken } from "../lib/graphToken";
import { bfAcquireSilentO365Tokens, msalClient } from "../auth/msal";

describe("v425 the Graph token is not left in plain storage", () => {
  beforeEach(async () => {
    await clearGraphAccessToken();
    localStorage.clear();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("a silent MSAL acquire keeps the Graph token out of localStorage", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    localStorage.setItem("msgraph_access_token", "stale-from-v424");
    const account = { username: "u@x.com", homeAccountId: "h" };
    vi.spyOn(msalClient, "getActiveAccount").mockReturnValue(account as any);
    vi.spyOn(msalClient, "getAllAccounts").mockReturnValue([account] as any);
    vi.spyOn(msalClient, "acquireTokenSilent").mockResolvedValueOnce({ accessToken: "graph.tok", idToken: "id" } as any);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(await bfAcquireSilentO365Tokens(null)).toBe(true);

    expect(setItem.mock.calls.filter(([k]) => k === "msgraph_access_token")).toEqual([]);
    expect(localStorage.getItem("msgraph_access_token")).toBeNull();
    expect(await getGraphAccessToken()).toBe("graph.tok");
  });

  it("clears any copy an older build left behind", async () => {
    localStorage.setItem("msgraph_access_token", "stale-from-v424");
    await setGraphAccessToken("fresh");
    expect(localStorage.getItem("msgraph_access_token")).toBeNull();
  });

  it("round-trips in memory on web", async () => {
    await setGraphAccessToken("abc");
    expect(await getGraphAccessToken()).toBe("abc");
  });

  it("clears completely", async () => {
    await setGraphAccessToken("abc");
    await clearGraphAccessToken();
    expect(await getGraphAccessToken()).toBeNull();
    expect(localStorage.getItem("msgraph_access_token")).toBeNull();
  });

  it("ignores an empty token", async () => {
    await setGraphAccessToken("  ");
    expect(await getGraphAccessToken()).toBeNull();
  });
});
