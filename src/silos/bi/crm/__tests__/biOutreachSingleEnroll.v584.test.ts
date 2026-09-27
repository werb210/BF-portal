// BF_PORTAL_BLOCK_v584
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const src = readFileSync("src/silos/bi/crm/BIOutreach.tsx", "utf-8");
describe("v584 single-contact enroll tells the truth", () => {
  it("treats 'nothing added, skipped' as a failure with the reason", () => {
    expect(src).toContain("const added = Number(r?.inserted ?? 0) + Number(r?.restarted ?? 0);");
    expect(src).toContain("if (!r?.mock && added === 0 && skip) {");
    expect(src).toContain("return { ok: false, error: ENROLL_SKIP_REASON_LABEL[reason] ?? reason };");
  });
  it("shows the reason on the button", () => {
    expect(src).toContain('setFeedback(`Failed: ${r.error ?? "enroll_failed"}`);');
  });
});
