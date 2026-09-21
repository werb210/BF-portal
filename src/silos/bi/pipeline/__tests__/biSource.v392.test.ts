// BF_PORTAL_BI_SOURCE_LABEL_v392
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { biSourceLabel, biSourceShort } from "../biSource";

describe("BI source labels", () => {
  it("names a BF referral instead of calling it public", () => {
    expect(biSourceLabel({ source: "bf_pgi_referral", source_type: "public" })).toBe("Boreal Financial referral");
    expect(biSourceLabel({ source_type: "public", bf_application_id: "bf-1" })).toBe("Boreal Financial referral");
    expect(biSourceShort({ source: "bf_pgi_referral" })).toBe("BF referral");
  });
  it("keeps lender and referrer labels", () => {
    expect(biSourceLabel({ source_type: "lender", lender_name: "ATB" })).toBe("Lender-submitted (ATB)");
    expect(biSourceShort({ source: "referrer" })).toBe("Referrer");
  });
  it("a boreal.insure applicant is a website application", () => {
    expect(biSourceLabel({ source_type: "public", source: "public" })).toBe("Website application");
    expect(biSourceShort({ source: "public" })).toBe("Website");
  });
  it("no screen says Public any more", () => {
    const read = (f: string) => readFileSync(join(process.cwd(), "src/silos/bi/pipeline", f), "utf8");
    expect(read("BIApplicationDetail.tsx")).not.toContain('"Public application"');
    expect(read("BIPipeline.tsx")).not.toContain(': "Public"}');
    expect(read("BIPipeline.tsx")).toContain('<option value="bf_pgi_referral">BF referral</option>');
  });
});
