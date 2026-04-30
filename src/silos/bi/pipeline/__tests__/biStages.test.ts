import { describe, it, expect } from "vitest";
import { BI_STAGES, biStage, biStageLabel, canTransitionManually } from "../biStages";

describe("BI_PIPELINE_ALIGN_v57 stages", () => {
  it("has the 8 canonical stages aligned with PGI carrier API", () => {
    expect(BI_STAGES.map((s) => s.id)).toEqual([
      "new_application", "documents_pending", "under_review", "submitted",
      "quoted", "bound", "declined", "claim",
    ]);
  });
  it("biStageLabel returns the human label", () => {
    expect(biStageLabel("under_review")).toBe("Internal Review");
    expect(biStageLabel("submitted")).toBe("Submitted to Carrier");
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
  });
  it("rejects manual transitions to PGI-driven stages", () => {
    expect(canTransitionManually("submitted", "quoted")).toBe(false);
    expect(canTransitionManually("submitted", "bound")).toBe(false);
    expect(canTransitionManually("under_review", "declined")).toBe(false);
  });
});
