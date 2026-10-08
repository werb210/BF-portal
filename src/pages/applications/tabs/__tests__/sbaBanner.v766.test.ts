// BF_PORTAL_SBA_BANNER_v766
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("SBA signing banner", () => {
  it("SBA files are pointed to the SBA Signing tab instead of being told to wait for a lender", () => {
    expect(readFileSync("src/pages/applications/tabs/ApplicationTab.tsx", "utf8")).toContain('case "sba_use_sba_signing": return "SBA file - send it from the SBA Signing tab";');
  });
});
