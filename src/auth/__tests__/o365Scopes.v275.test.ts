// BF_PORTAL_O365_SCOPES_v275
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { o365ReasonFrom, REQUIRED_O365_SCOPES, withRequiredO365Scopes } from "../o365Scopes";

describe("Office 365 scopes", () => {
  it("adds mail read and offline access when the build secret leaves them out", () => {
    const scopes = withRequiredO365Scopes("User.Read,Mail.Send,Calendars.ReadWrite,Tasks.ReadWrite");
    expect(scopes).toContain("Mail.ReadWrite");
    expect(scopes).toContain("offline_access");
    expect(scopes.slice(0, 4)).toEqual(["User.Read", "Mail.Send", "Calendars.ReadWrite", "Tasks.ReadWrite"]);
  });
  it("keeps extra configured scopes and never duplicates", () => {
    const scopes = withRequiredO365Scopes("User.Read, mail.readwrite, Mail.ReadWrite.Shared");
    expect(scopes.filter((s) => s.toLowerCase() === "mail.readwrite")).toHaveLength(1);
    expect(scopes).toContain("Mail.ReadWrite.Shared");
    for (const s of REQUIRED_O365_SCOPES) expect(scopes.map((x) => x.toLowerCase())).toContain(s.toLowerCase());
  });
  it("reads the server's explanation from a failed request", () => {
    expect(o365ReasonFrom({ details: { error: "o365_reauth_required", reason: "Reconnect Office 365." } })).toBe("Reconnect Office 365.");
    expect(o365ReasonFrom(new Error("x"))).toBeNull();
  });
});

describe("wiring", () => {
  const root = path.resolve(__dirname, "../../..");
  const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
  it("every sign-in path uses the required scopes", () => {
    expect(read("src/config/microsoftAuth.ts")).toContain("withRequiredO365Scopes(scopeValue)");
    expect(read("src/auth/msal.ts").match(/withRequiredO365Scopes\(String\(scopesEnv\)\)/g)?.length).toBe(2);
  });
  it("the inbox shows Reconnect or the reason instead of an empty inbox", () => {
    const page = read("src/pages/communications/CommunicationsPage.tsx");
    expect(page).toContain("if (rejected.length > 0 && rejected.length === results.length) throw rejected[0]!.reason;");
    expect(page).toContain("status === 401 || status === 412");
    expect(page).toContain("{reconnectReason ??");
  });
});
