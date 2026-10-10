// BF_PORTAL_V780 - audit fixes: Apollo sections gone, Disconnect reaches the server, no calls to missing addresses.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("v780 audit fixes", () => {
  it("BI Marketing Lists and Mailbox Health no longer call the removed Apollo routes", () => {
    for (const f of ["src/silos/bi/marketing/tabs/ListsTab.tsx", "src/silos/bi/marketing/tabs/MailboxHealthTab.tsx"]) {
      expect(read(f)).not.toContain("/admin/apollo");
    }
    expect(read("src/silos/bi/marketing/tabs/ListsTab.tsx")).toContain("/api/v1/bi/marketing/lists");
    expect(read("src/silos/bi/marketing/tabs/MailboxHealthTab.tsx")).toContain("/api/v1/bi/marketing/mailbox-health");
  });
  it("Microsoft Disconnect forgets the connection on the server", () => {
    const s = read("src/pages/settings/tabs/ProfileSettings.tsx");
    expect(s).toContain('api.post("/api/o365-oauth/disconnect"');
    expect(s).not.toContain("onClick={() => setMicrosoftConnection({ connected: false, email: undefined })}");
  });
  it("BI screens do not call BI refresh or login addresses that BI-Server does not have", () => {
    const s = read("src/pages/applications/bi/bi.pipeline.api.ts");
    for (const gone of ["/api/v1/otp/refresh", "/api/v1/otp/request", "/api/v1/otp/verify", "/api/v1/staff/login"]) expect(s).not.toContain(gone);
  });
  it("unused calls to missing addresses are gone", () => {
    expect(read("src/lib/endpoints.ts")).not.toMatch(/dialer\/token|voice\/status/);
    expect(read("src/api/communications.ts")).not.toContain("/acknowledge");
    expect(read("src/api/crm.ts")).not.toContain("/api/crm/deals");
    expect(read("src/api/lenders.ts")).not.toContain("/requirements/");
  });
});
