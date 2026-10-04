// BF_PORTAL_FEE_DIAGNOSE_v743
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { textLine } from "../FeeAgreementPanel";

describe("fee agreement delivery check", () => {
  it("shows a carrier rejection in plain words", () => {
    const l = textLine({ toLast4: "0100", status: "undelivered", errorCode: "30032", createdAt: "2026-10-04T20:00:00Z" });
    expect(l.bad).toBe(true);
    expect(l.text).toContain("text to mobile ending 0100: NOT delivered (Twilio error 30032)");
    expect(textLine({ toLast4: "0100", status: "delivered", errorCode: null, createdAt: "2026-10-04T20:00:00Z" }).text).toContain(": delivered");
  });
  it("has a Check delivery setup button that calls the diagnosis", () => {
    const s = readFileSync("src/components/applications/FeeAgreementPanel.tsx", "utf8");
    expect(s).toContain("Check delivery setup");
    expect(s).toContain('"/fee-agreement/diagnose"');
  });
});
