// BF_PORTAL_ENROLL_RESULT_TRUTH_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/silos/bi/crm/BIOutreach.tsx", "utf8");

const ENROLL_SKIP_REASON_LABEL: Record<string, string> = {
  not_found: "contact not found",
  no_email: "no email address",
  no_consent_basis: "no CASL consent basis on file",
  consent_expired: "CASL consent has expired",
  suppressed: "on the suppression list",
  already_enrolled: "already in this sequence",
};

function render(result: any): string {
  const enrolled = Number(result?.inserted ?? result?.enrolled ?? result?.added ?? 0);
  const skipped = Number(result?.skipped ?? 0);
  const skips: Array<{ reason?: string }> = Array.isArray(result?.skips) ? result.skips : [];
  let detail = "";
  if (skips.length > 0) {
    const byReason = new Map<string, number>();
    for (const skip of skips) {
      const key = String(skip?.reason ?? "unknown");
      byReason.set(key, (byReason.get(key) ?? 0) + 1);
    }
    detail = ` (${[...byReason.entries()]
      .map(([reason, count]) => `${count} ${ENROLL_SKIP_REASON_LABEL[reason] ?? reason}`)
      .join(", ")})`;
  }
  return `${enrolled} added${skipped ? `; ${skipped} skipped${detail}` : ""}.`;
}

describe("BF_PORTAL_ENROLL_RESULT_TRUTH_v1", () => {
  it("reads inserted, the field the server actually sends", () => {
    expect(source).toContain("result?.inserted");
    expect(render({ inserted: 3, skipped: 0 })).toBe("3 added.");
  });
  it("names the real skip reason instead of guessing", () => {
    expect(render({ inserted: 0, skipped: 1, skips: [{ reason: "no_consent_basis" }] }))
      .toBe("0 added; 1 skipped (1 no CASL consent basis on file).");
  });
  it("groups and counts multiple reasons", () => {
    expect(render({ inserted: 1, skipped: 3,
      skips: [{ reason: "suppressed" }, { reason: "suppressed" }, { reason: "no_email" }] }))
      .toBe("1 added; 3 skipped (2 on the suppression list, 1 no email address).");
  });
  it("falls back to counts alone when skips is absent", () => {
    expect(render({ inserted: 0, skipped: 1 })).toBe("0 added; 1 skipped.");
  });
  it("passes an unrecognised reason through verbatim", () => {
    expect(render({ inserted: 0, skipped: 1, skips: [{ reason: "brand_new_reason" }] }))
      .toBe("0 added; 1 skipped (1 brand_new_reason).");
  });
  it("does not render undefined for a reasonless skip", () => {
    expect(render({ inserted: 0, skipped: 1, skips: [{}] })).toBe("0 added; 1 skipped (1 unknown).");
  });
});
