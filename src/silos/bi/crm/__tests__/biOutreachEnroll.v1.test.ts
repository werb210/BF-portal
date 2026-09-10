import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/silos/bi/crm/BIOutreach.tsx"), "utf8");

describe("BI Outreach sequence enrollment", () => {
  it("uses only BI marketing sequences", () => {
    expect(source).toContain("biSequences");
    expect(source).toContain('"/api/v1/bi/marketing/sequences"');
    expect(source).toContain("sequences={sequences}");
    expect(source).not.toContain("/api/v1/bi/apollo/sequences");
  });

  it("enrolls the explicitly selected contacts and reports skips", () => {
    expect(source).toContain("body: { contactIds }");
    expect(source).not.toContain("already enrolled or no CASL consent basis");
    expect(source).toContain('data-testid="bi-outreach-enroll"');
  });

  it("enrolls an individual contact through the BI marketing endpoint", () => {
    expect(source).toContain("`/api/v1/bi/marketing/sequences/${sequenceId}/enroll`");
    expect(source).toContain("body: { contactIds: [contactId] }");
  });
});
