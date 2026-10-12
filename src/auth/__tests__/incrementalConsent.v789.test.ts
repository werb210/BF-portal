// BF_PORTAL_v789_INCREMENTAL_CONSENT / BF_PORTAL_v789_MSAL_SESSION_STORAGE
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  config: null as any,
  silent: vi.fn(),
  popup: vi.fn(),
  accounts: [{ username: "me@boreal.financial", homeAccountId: "acc-1" }] as any[],
  post: vi.fn(async () => ({})),
}));
vi.mock("@azure/msal-browser", () => {
  class InteractionRequiredAuthError extends Error { name = "InteractionRequiredAuthError"; }
  class BrowserAuthError extends Error { errorCode = "x"; }
  class PublicClientApplication {
    constructor(config: unknown) { h.config = config; }
    initialize = async () => undefined;
    getActiveAccount = () => null;
    getAllAccounts = () => h.accounts;
    acquireTokenSilent = (...a: unknown[]) => h.silent(...a);
    acquireTokenPopup = (...a: unknown[]) => h.popup(...a);
  }
  return { PublicClientApplication, InteractionRequiredAuthError, BrowserAuthError };
});
vi.mock("@/api", () => ({ api: { post: h.post } }));
vi.mock("@/lib/graphToken", () => ({ setGraphAccessToken: vi.fn(async () => undefined) }));

import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { ensureO365Scopes, __resetO365Consent } from "@/auth/msal";
import { featureO365Scopes, isO365ConsentError, signInO365Scopes } from "@/auth/o365Scopes";
import { microsoftAuthConfig } from "@/config/microsoftAuth";

beforeEach(() => {
  __resetO365Consent();
  h.silent.mockReset();
  h.popup.mockReset();
  h.post.mockClear();
});

describe("MSAL cache", () => {
  it("keeps Microsoft tokens in sessionStorage", () => {
    expect(h.config.cache.cacheLocation).toBe("sessionStorage");
  });
});

describe("sign-in scopes", () => {
  it("asks for VITE_MSAL_SCOPES plus the essentials, but not Mail.ReadWrite or Files.ReadWrite", () => {
    const scopes = signInO365Scopes("User.Read,Mail.Send,mail.readwrite,Files.ReadWrite,Mail.Send.Shared");
    expect(scopes).toEqual(["User.Read", "Mail.Send", "Mail.Send.Shared", "Calendars.ReadWrite", "Tasks.ReadWrite", "offline_access"]);
    expect(microsoftAuthConfig.scopes.map((s) => s.toLowerCase())).not.toContain("mail.readwrite");
    expect(microsoftAuthConfig.scopes.map((s) => s.toLowerCase())).not.toContain("files.readwrite");
    expect(microsoftAuthConfig.scopes).toContain("offline_access");
  });

  it("a feature adds its own scope on top", () => {
    expect(featureO365Scopes("User.Read", ["Files.ReadWrite"])).toContain("Files.ReadWrite");
  });

  it("recognises the server's missing-permission answers", () => {
    expect(isO365ConsentError({ status: 412 })).toBe(true);
    expect(isO365ConsentError({ code: "onedrive_permission_needed" })).toBe(true);
    expect(isO365ConsentError({ status: 500, message: "boom" })).toBe(false);
  });
});

describe("ensureO365Scopes", () => {
  it("silently gets a token with the extra scope and hands it to BF-Server once", async () => {
    h.silent.mockResolvedValue({ accessToken: "graph-1", expiresOn: new Date(Date.now() + 3600_000) });
    await expect(ensureO365Scopes(["Files.ReadWrite"])).resolves.toBe(true);
    expect(h.silent.mock.calls[0]?.[0].scopes).toContain("Files.ReadWrite");
    expect(h.post).toHaveBeenCalledWith("/api/users/me/o365-tokens", expect.objectContaining({ access_token: "graph-1", account_id: "acc-1" }));
    await ensureO365Scopes(["Files.ReadWrite"]);
    expect(h.silent).toHaveBeenCalledTimes(1);
    expect(h.popup).not.toHaveBeenCalled();
  });

  it("without a click it never opens a popup", async () => {
    h.silent.mockRejectedValue(new InteractionRequiredAuthError("consent_required"));
    await expect(ensureO365Scopes(["Mail.ReadWrite"])).resolves.toBe(false);
    expect(h.popup).not.toHaveBeenCalled();
  });

  it("on a click it asks for consent when Microsoft requires it", async () => {
    h.silent.mockRejectedValue(new InteractionRequiredAuthError("consent_required"));
    h.popup.mockResolvedValue({ accessToken: "graph-2", expiresOn: null });
    await expect(ensureO365Scopes(["Mail.ReadWrite"], { interactive: true })).resolves.toBe(true);
    expect(h.popup.mock.calls[0]?.[0].scopes).toContain("Mail.ReadWrite");
    expect(h.post).toHaveBeenCalledWith("/api/users/me/o365-tokens", expect.objectContaining({ access_token: "graph-2" }));
  });
});
