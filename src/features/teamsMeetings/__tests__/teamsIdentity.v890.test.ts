// BF_PORTAL_v890_TEAMS_IDENTITY - the Microsoft token for Azure Communication Services, silent only.
import { describe, expect, it, vi } from "vitest";
import { ACS_TEAMS_SCOPES, teamsIdentityToken } from "../teamsMeetingApi";

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
});
