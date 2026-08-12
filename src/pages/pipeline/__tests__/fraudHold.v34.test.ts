// BF_PORTAL_FRAUD_HOLD_v34
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/pipeline/PipelinePage.tsx", "utf8");

describe("Fraud and Hold columns", () => {
  it("adds both columns to the board", () => {
    const stages = src.slice(src.indexOf("const STAGES = ["), src.indexOf("] as const;"));
    expect(stages).toContain('"Fraud"');
    expect(stages).toContain('"Hold"');
  });

  it("gives each column a colour, so a card never renders unstyled", () => {
    const colors = src.slice(src.indexOf("const COLORS"), src.indexOf("type DocProgress"));
    expect(colors).toContain('"Fraud"');
    expect(colors).toContain('"Hold"');
  });

  it("carries the park details the server sends", () => {
    expect(src).toContain("parked_previous_stage?: string | null;");
    expect(src).toContain("parked_reason?: string | null;");
  });
});

describe("parking is never one click", () => {
  it("asks for a reason before parking", () => expect(src).toContain("window.prompt(prompt"));
  it("refuses to mark fraud without a reason", () => expect(src).toContain("A reason is required to mark an application as fraud."));
  it("aborts cleanly when the prompt is cancelled", () => expect(src).toContain("if (entered === null) return;"));
  it("still moves working stages without prompting", () => expect(src).toContain("if (isParkedStage(toStage)) {"));
});

describe("reactivating", () => {
  it("returns a parked file to the stage it left", () => expect(src).toContain('const back = card.parked_previous_stage || "In Review";'));
  it("confirms before reactivating", () => expect(src).toContain("Reactivate this application and return it to"));
  it("shows the reason on a parked card", () => expect(src).toContain("{card.parked_reason}"));
  it("moves a card into Fraud or Hold by dragging, not by a button on the card", () => {
    // BF_PORTAL_PIPELINE_DND_v35 - the per-card buttons were never asked for.
    expect(src).not.toContain('onMove(card.id, "Fraud")');
    expect(src).toContain("void handleDrop(stage)");
  });
});
