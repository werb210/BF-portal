// BF_PORTAL_O365_SCOPES_v275 (+ BF_PORTAL_v789_INCREMENTAL_CONSENT)
// BF_PORTAL_v789_SOURCE_GREP - the wiring checks used to read msal.ts, microsoftAuth.ts and
// CommunicationsPage.tsx as text; they now check the scopes the code actually produces.
import { describe, expect, it } from "vitest";
import { o365ReasonFrom, SIGN_IN_O365_SCOPES, signInO365Scopes } from "../o365Scopes";
import { microsoftAuthConfig } from "@/config/microsoftAuth";

describe("Office 365 scopes", () => {
  it("adds offline access and the other essentials when the build secret leaves them out", () => {
    const scopes = signInO365Scopes("User.Read,Mail.Send");
    expect(scopes).toContain("offline_access");
    expect(scopes.slice(0, 2)).toEqual(["User.Read", "Mail.Send"]);
    for (const s of SIGN_IN_O365_SCOPES) expect(scopes).toContain(s);
  });
  it("keeps extra configured scopes and never duplicates", () => {
    const scopes = signInO365Scopes("User.Read, user.read, Mail.Send.Shared");
    expect(scopes.filter((s: string) => s.toLowerCase() === "user.read")).toHaveLength(1);
    expect(scopes).toContain("Mail.Send.Shared");
  });
  it("every sign-in path uses those scopes", () => {
    expect(microsoftAuthConfig.scopes).toEqual(signInO365Scopes(import.meta.env.VITE_MSAL_SCOPES ?? "User.Read,Mail.Send,Calendars.ReadWrite,Tasks.ReadWrite,offline_access"));
  });
  it("reads the server's explanation from a failed request", () => {
    expect(o365ReasonFrom({ details: { error: "o365_reauth_required", reason: "Reconnect Office 365." } })).toBe("Reconnect Office 365.");
    expect(o365ReasonFrom(new Error("x"))).toBeNull();
  });
});
