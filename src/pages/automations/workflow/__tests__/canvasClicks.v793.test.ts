// BF_PORTAL_v793_CANVAS_CLICKS
// Every canvas node must take clicks. React Flow turns pointer events off on nodes that are
// neither selectable nor draggable, which left Details, every + and step cards in view mode dead.
import { describe, expect, it } from "vitest";
import { toNodes } from "../WorkflowCanvas";
import { layoutGraph } from "../graph";
import { emptyWorkflow } from "../types";

describe("workflow canvas nodes take clicks", () => {
  it("an empty workflow's trigger card, + and End all accept pointer events", () => {
    const nodes = toNodes(layoutGraph(emptyWorkflow("BF").graph).items, null, false);
    expect(nodes.map((n) => n.type)).toEqual(expect.arrayContaining(["trigger", "plus"]));
    for (const n of nodes) expect(n.style?.pointerEvents).toBe("all");
  });

  it("read-only and moving modes still take clicks, and only step cards drag", () => {
    const nodes = toNodes(layoutGraph(emptyWorkflow("BF").graph).items, "x", true);
    for (const n of nodes) {
      expect(n.style?.pointerEvents).toBe("all");
      expect(n.draggable).toBe(false);
    }
  });
});
