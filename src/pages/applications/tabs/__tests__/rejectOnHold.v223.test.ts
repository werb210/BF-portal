// BF_PORTAL_REJECT_ON_HOLD_v223
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf-8");

describe("rejecting a parked application", () => {
  it("no longer hides Reject behind the not-parked branch", () => {
    const reject = src.indexOf('data-testid="reject-application"');
    const reactivate = src.indexOf("Reactivate");
    expect(reject).toBeGreaterThan(-1);
    // Reject must not be nested inside the reactivate else-branch any more.
    const between = src.slice(reactivate, reject);
    expect(between).toContain("BF_PORTAL_REJECT_ON_HOLD_v223");
  });

  it("keeps the Reactivate action for parked files", () => {
    expect(src).toContain("Reactivate");
  });

  it("leaves the JSX balanced", () => {
    const seg = src.slice(src.indexOf("BF_PORTAL_REJECT_ON_HOLD_v223"), src.indexOf("BF_PORTAL_REJECT_ON_HOLD_v223") + 4000);
    expect(seg.split("<>").length).toBe(seg.split("</>").length);
  });
});

describe("recording a pass", () => {
  it("sends a trimmed note, which the server now allows to be empty", () => {
    expect(src).toContain("reason: note.trim()");
  });

  it("still sends the reason codes the server falls back to", () => {
    expect(src).toContain("reasonCodes: codes");
  });
});
