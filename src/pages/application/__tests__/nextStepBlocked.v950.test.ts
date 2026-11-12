// BF_PORTAL_v950_NEXT_STEP_BLOCKED
import { describe, expect, it } from "vitest";
import { nextStepFor, offerStateOf } from "../nextStep";

describe("the Next button at the Offer stage", () => {
  it("says send only when a term sheet can actually be sent", () => {
    expect(offerStateOf([{ status: "pending", expired: false, has_amount: true }])).toBe("draft");
    expect(nextStepFor({ stage: "Offer", signing: null, offers: 1, offerState: "draft" })?.label).toBe("Send term sheet for signature");
  });
  it("says fix it when every unsent term sheet is expired or has no amount", () => {
    expect(offerStateOf([{ status: "pending", expired: true }, { status: "pending", has_amount: false }])).toBe("blocked");
    expect(nextStepFor({ stage: "Offer", signing: null, offers: 2, offerState: "blocked" })?.label).toBe("Fix the term sheet so it can be sent");
  });
  it("one good term sheet among expired ones is still sendable; sent and signed are unchanged", () => {
    expect(offerStateOf([{ status: "pending", expired: true }, { status: "pending", expired: false }])).toBe("draft");
    expect(offerStateOf([{ status: "pending_acceptance" }, { status: "pending", expired: true }])).toBe("sent");
    expect(offerStateOf([{ status: "accepted" }, { status: "pending" }])).toBe("signed");
    expect(offerStateOf([])).toBe("none");
  });
});
