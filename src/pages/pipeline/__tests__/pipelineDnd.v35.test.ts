// BF_PORTAL_PIPELINE_DND_v35
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/pipeline/PipelinePage.tsx", "utf8");

describe("cards move by dragging", () => {
  it("makes every card draggable", () => {
    expect(src).toContain("draggable={!acting && !deleting}");
    expect(src).toContain("onDragStart=");
  });

  it("makes every column a drop target", () => {
    expect(src).toContain("onDragOver=");
    expect(src).toContain("onDrop=");
  });

  it("highlights the column being dragged over", () => {
    expect(src).toContain("const isTarget = dragOver === stage && dragging !== null;");
  });

  it("ignores a drop back onto the column the card came from", () => {
    expect(src).toContain("effectiveStage(card) === toStage) return;");
  });
});

describe("Accepted still captures the funded amount", () => {
  it("refuses a drop onto Accepted and points at the Accept button", () => {
    expect(src).toContain('if (toStage === "Accepted")');
    expect(src).toContain("Use the Accept button on the card");
  });
});

describe("the per-card Hold and Fraud buttons are gone", () => {
  it("no longer renders a Fraud button on every card", () => {
    expect(src).not.toContain('onMove(card.id, "Fraud")');
    expect(src).not.toContain('onMove(card.id, "Hold")');
  });

  it("still prompts for a reason when a card lands in Fraud or Hold", () => {
    expect(src).toContain("if (isParkedStage(toStage)) {");
    expect(src).toContain("A reason is required to mark an application as fraud.");
  });

  it("keeps Reactivate on a parked card", () => {
    expect(src).toContain("Reactivate this application and return it to");
  });
});
