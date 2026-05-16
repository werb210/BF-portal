// BF_PORTAL_BLOCK_BI_ROUND8_STAGES_v1 -- test rewrite to match the
// 10-stage spec from BI_SUBMISSION_PIPELINE_V1.md sec 3. Legacy
// 8-stage IDs still resolve via LEGACY_ALIASES so production data
// keeps rendering correctly during the BI-Server migration window;
// these tests cover both the new canonical list and alias resolution.
import { describe, it, expect } from "vitest";
import {
  BI_STAGES,
  BI_VISIBLE_PIPELINE_STAGES,
  BI_LENDER_VISIBLE_STAGES,
  BI_STAFF_INTERACTIVE_STAGES,
  biStage,
  biStageLabel,
  resolveStageId,
  canTransitionManually,
} from "../biStages";

describe("BI 10-stage spec", () => {
  it("has the canonical 10 stages aligned with PGI carrier API", () => {
    expect(BI_STAGES.map((s) => s.id)).toEqual([
      "created",
      "in_progress",
      "document_review",
      "ready_for_submission",
      "submitted",
      "under_review",
      "information_required",
      "approved",
      "declined",
      "policy_issued",
    ]);
  });

  it("exposes all 10 stages in the staff pipeline view", () => {
    expect([...BI_VISIBLE_PIPELINE_STAGES]).toEqual([
      "created",
      "in_progress",
      "document_review",
      "ready_for_submission",
      "submitted",
      "under_review",
      "information_required",
      "approved",
      "declined",
      "policy_issued",
    ]);
  });

  it("exposes 9 stages in the lender/referrer pipeline (no document_review)", () => {
    expect([...BI_LENDER_VISIBLE_STAGES]).toEqual([
      "created",
      "in_progress",
      "ready_for_submission",
      "submitted",
      "under_review",
      "information_required",
      "approved",
      "declined",
      "policy_issued",
    ]);
    expect([...BI_LENDER_VISIBLE_STAGES]).not.toContain("document_review");
  });

  it("flags the stages where staff actively work", () => {
    expect([...BI_STAFF_INTERACTIVE_STAGES]).toEqual([
      "document_review",
      "ready_for_submission",
      "information_required",
    ]);
  });

  it("biStageLabel returns the human label for the new IDs", () => {
    expect(biStageLabel("created")).toBe("New");
    expect(biStageLabel("in_progress")).toBe("In progress");
    expect(biStageLabel("document_review")).toBe("Doc review");
    expect(biStageLabel("submitted")).toBe("Submitted to carrier");
    expect(biStageLabel("under_review")).toBe("Under review");
    expect(biStageLabel("policy_issued")).toBe("Policy issued");
    expect(biStageLabel(null)).toBe("—");
  });

  it("resolves legacy 8-stage IDs to the new spec via LEGACY_ALIASES", () => {
    expect(resolveStageId("new_application")).toBe("created");
    expect(resolveStageId("documents_pending")).toBe("document_review");
    expect(resolveStageId("requires_docs")).toBe("document_review");
    expect(resolveStageId("internal_review")).toBe("ready_for_submission");
    expect(resolveStageId("submitted_to_insurer")).toBe("submitted");
    expect(resolveStageId("sent_to_pgi")).toBe("submitted");
    expect(resolveStageId("docs_rejected")).toBe("document_review");
    expect(resolveStageId("quoted")).toBe("under_review");
    expect(resolveStageId("bound")).toBe("policy_issued");
    expect(resolveStageId("claim")).toBe("policy_issued");
  });

  it("returns the new label even when given a legacy ID", () => {
    expect(biStageLabel("new_application")).toBe("New");
    expect(biStageLabel("documents_pending")).toBe("Doc review");
    expect(biStageLabel("quoted")).toBe("Under review");
    expect(biStageLabel("bound")).toBe("Policy issued");
  });

  it("treats declined and policy_issued as terminal", () => {
    expect(biStage("declined")?.isTerminal).toBe(true);
    expect(biStage("policy_issued")?.isTerminal).toBe(true);
    expect(biStage("submitted")?.isTerminal).toBe(false);
    expect(biStage("under_review")?.isTerminal).toBe(false);
  });

  it("flags PGI-driven stages (carrier webhook owns them)", () => {
    expect(biStage("under_review")?.isPgiDriven).toBe(true);
    expect(biStage("information_required")?.isPgiDriven).toBe(true);
    expect(biStage("approved")?.isPgiDriven).toBe(true);
    expect(biStage("declined")?.isPgiDriven).toBe(true);
    expect(biStage("policy_issued")?.isPgiDriven).toBe(true);
    expect(biStage("submitted")?.isPgiDriven).toBe(false);
    expect(biStage("ready_for_submission")?.isPgiDriven).toBe(false);
  });

  it("marks document_review as staff-only (lender/referrer skip it)", () => {
    expect(biStage("document_review")?.isStaffOnly).toBe(true);
    expect(biStage("ready_for_submission")?.isStaffOnly).toBe(false);
    expect(biStage("submitted")?.isStaffOnly).toBe(false);
  });

  it("allows the canonical forward transitions per spec", () => {
    expect(canTransitionManually("created", "in_progress")).toBe(true);
    expect(canTransitionManually("in_progress", "document_review")).toBe(true);
    expect(canTransitionManually("in_progress", "ready_for_submission")).toBe(true);
    expect(canTransitionManually("document_review", "ready_for_submission")).toBe(true);
    expect(canTransitionManually("ready_for_submission", "submitted")).toBe(true);
  });

  it("rejects manual transitions into PGI-driven stages", () => {
    expect(canTransitionManually("submitted", "under_review")).toBe(false);
    expect(canTransitionManually("submitted", "declined")).toBe(false);
    expect(canTransitionManually("under_review", "policy_issued")).toBe(false);
    expect(canTransitionManually("ready_for_submission", "policy_issued")).toBe(false);
  });

  it("rejects manual transitions from terminal stages", () => {
    expect(canTransitionManually("declined", "submitted")).toBe(false);
    expect(canTransitionManually("policy_issued", "submitted")).toBe(false);
  });
});
