import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const s = readFileSync("src/silos/bi/pipeline/tabs/CoGuarantorList.tsx", "utf-8");
describe("v665 co-guarantors host", () => {
  it("uses the BI api wrapper, not a relative fetch", () => {
    expect(s).toContain('apiForSilo("BI")');
    expect(s).not.toContain('await fetch(`/api/v1/bi/applications/${applicationId}/co-guarantors`');
  });
});
