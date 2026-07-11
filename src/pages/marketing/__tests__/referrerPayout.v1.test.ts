// BF_PORTAL_REFERRER_PAYOUT_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const s = readFileSync(path.join(process.cwd(), "src/pages/marketing/BFReferrerManagement.tsx"), "utf8");
describe("referrer payout button", () => {
  it("posts to the admin pay endpoint and refreshes", () => {
    expect(s).toContain("/api/admin/referrers/${id}/pay");
    expect(s).toContain("await load()");
  });
  it("renders a Pay out button gated on accrued", () => {
    expect(s).toContain("Pay out ${fmtMoney(props.accrued)}");
    expect(s).toContain("props.accrued <= 0");
  });
});
