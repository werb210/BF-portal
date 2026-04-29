// BF_PORTAL_O365_REDIRECT_v55 — verify silent-acquire iframe failure
// triggers acquireTokenRedirect fallback exactly once per session.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserAuthError } from "@azure/msal-browser";

import { bfAcquireSilentO365Tokens, msalClient } from "../msal";

describe("BF_PORTAL_O365_REDIRECT_v55", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to acquireTokenRedirect when silent acquire fails with monitor_window_timeout", async () => {
    vi.spyOn(msalClient, "getActiveAccount").mockReturnValue({ username: "u@x.com", homeAccountId: "h" } as any);
    vi.spyOn(msalClient, "getAllAccounts").mockReturnValue([{ username: "u@x.com", homeAccountId: "h" }] as any);
    vi.spyOn(msalClient, "acquireTokenSilent").mockRejectedValueOnce(
      new BrowserAuthError("monitor_window_timeout", "iframe blocked"),
    );
    const acquireRedirectSpy = vi.spyOn(msalClient, "acquireTokenRedirect").mockResolvedValueOnce(undefined as any);

    const result = await bfAcquireSilentO365Tokens(null);

    expect(result).toBe(false);
    expect(acquireRedirectSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("bf_msal_redirect_attempted")).toBe("1");
  });

  it("does NOT redirect a second time in the same session", async () => {
    sessionStorage.setItem("bf_msal_redirect_attempted", "1");
    vi.spyOn(msalClient, "getActiveAccount").mockReturnValue({ username: "u@x.com", homeAccountId: "h" } as any);
    vi.spyOn(msalClient, "getAllAccounts").mockReturnValue([{ username: "u@x.com", homeAccountId: "h" }] as any);
    vi.spyOn(msalClient, "acquireTokenSilent").mockRejectedValueOnce(
      new BrowserAuthError("monitor_window_timeout", "iframe blocked"),
    );
    const acquireRedirectSpy = vi.spyOn(msalClient, "acquireTokenRedirect").mockResolvedValue(undefined as any);

    const result = await bfAcquireSilentO365Tokens(null);

    expect(result).toBe(false);
    expect(acquireRedirectSpy).not.toHaveBeenCalled();
  });

  it("does NOT redirect on InteractionRequiredAuthError (user must click Connect)", async () => {
    vi.spyOn(msalClient, "getActiveAccount").mockReturnValue({ username: "u@x.com", homeAccountId: "h" } as any);
    vi.spyOn(msalClient, "getAllAccounts").mockReturnValue([{ username: "u@x.com", homeAccountId: "h" }] as any);
    vi.spyOn(msalClient, "acquireTokenSilent").mockRejectedValueOnce(
      Object.assign(new Error("interaction required"), { name: "InteractionRequiredAuthError" }),
    );
    const acquireRedirectSpy = vi.spyOn(msalClient, "acquireTokenRedirect").mockResolvedValue(undefined as any);

    const result = await bfAcquireSilentO365Tokens(null);

    expect(result).toBe(false);
    expect(acquireRedirectSpy).not.toHaveBeenCalled();
  });
});
