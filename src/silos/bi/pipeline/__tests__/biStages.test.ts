import { describe, it, expect } from "vitest";
import { BI_STAGES, BI_VISIBLE_PIPELINE_STAGES, BI_STAFF_INTERACTIVE_STAGES, biStage, biStageLabel, canTransitionManually } from "../biStages";

describe("BI_PIPELINE_ALIGN_v57 stages", () => {
  // BF_PORTAL_BLOCK_v47_BI_SILO_PIPELINE_v1 — v47 added 'docs_rejected' and
  // 'sent_to_pgi' to align with the operator-locked 8-stage BI Issues 5
  // spec. The legacy 'submitted' value is retained for backwards compat
  // with pre-v47 rows, so BI_STAGES now has 10 entries total. The 8
  // operator-spec stages are exposed via BI_VISIBLE_PIPELINE_STAGES.
  it("has the canonical stages aligned with PGI carrier API", () => {
    expect(BI_STAGES.map((s) => s.id)).toEqual([
      "new_application", "documents_pending", "under_review",
      "docs_rejected", "sent_to_pgi",
      "submitted",
      "quoted", "bound", "declined", "claim",
    ]);
  });
  it("exposes the 8 operator-spec visible pipeline stages", () => {
    expect([...BI_VISIBLE_PIPELINE_STAGES]).toEqual([
      "new_application", "documents_pending", "under_review",
      "docs_rejected", "sent_to_pgi", "quoted", "bound", "declined",
    ]);
  });
  it("marks the first 4 stages as BI-staff-interactive", () => {
    expect([...BI_STAFF_INTERACTIVE_STAGES]).toEqual([
      "new_application", "documents_pending", "under_review", "docs_rejected",
    ]);
  });
  it("biStageLabel returns the human label", () => {
    expect(biStageLabel("under_review")).toBe("Docs in review");
    expect(biStageLabel("submitted")).toBe("Submitted to Carrier");
    expect(biStageLabel("sent_to_pgi")).toBe("Sent to PGI");
    expect(biStageLabel("docs_rejected")).toBe("Docs rejected");
    expect(biStageLabel(null)).toBe("—");
  });
  it("treats bound and declined as terminal", () => {
    expect(biStage("bound")?.isTerminal).toBe(true);
    expect(biStage("declined")?.isTerminal).toBe(true);
  });
  it("flags PGI-driven stages", () => {
    expect(biStage("quoted")?.isPgiDriven).toBe(true);
    expect(biStage("bound")?.isPgiDriven).toBe(true);
    expect(biStage("under_review")?.isPgiDriven).toBe(false);
    expect(biStage("sent_to_pgi")?.isPgiDriven).toBe(false);
  });
  it("rejects manual transitions to PGI-driven stages", () => {
    expect(canTransitionManually("submitted", "quoted")).toBe(false);
    expect(canTransitionManually("submitted", "bound")).toBe(false);
    expect(canTransitionManually("under_review", "declined")).toBe(false);
    expect(canTransitionManually("sent_to_pgi", "quoted")).toBe(false);
  });
  it("allows under_review to transition to docs_rejected or sent_to_pgi", () => {
    expect(canTransitionManually("under_review", "docs_rejected")).toBe(true);
    expect(canTransitionManually("under_review", "sent_to_pgi")).toBe(true);
  });
  it("allows docs_rejected to kick back to documents_pending or under_review", () => {
    expect(canTransitionManually("docs_rejected", "documents_pending")).toBe(true);
    expect(canTransitionManually("docs_rejected", "under_review")).toBe(true);
  });
});
