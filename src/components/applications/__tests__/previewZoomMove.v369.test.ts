// BF_PORTAL_PREVIEW_ZOOM_v369
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stepZoom, ZOOM_MAX, ZOOM_MIN } from "../DocumentSplitView";

const view = readFileSync(
  "src/components/applications/DocumentSplitView.tsx",
  "utf-8",
);
const pages = readFileSync("src/components/applications/PdfPages.tsx", "utf-8");
const tab = readFileSync(
  "src/pages/applications/tabs/DocumentsTab.tsx",
  "utf-8",
);

describe("the preview can be made bigger", () => {
  it("zooms in quarter steps between 100% and 300%", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(ZOOM_MIN);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(2, -1)).toBe(1.75);
  });
  it("has zoom buttons and applies zoom to PDFs and images", () => {
    expect(view).toContain('data-testid="zoom-in"');
    expect(view).toContain('data-testid="zoom-out"');
    expect(view).toContain('data-testid="zoom-reset"');
    expect(view).toContain("<PdfPages blob={doc.blob} zoom={zoom}");
    expect(view).toContain('maxWidth: zoom === 1 ? "100%" : "none"');
  });
  it("zooms by resizing canvases instead of re-rendering every page", () => {
    expect(pages).toContain(
      "canvas.style.width = `${Math.round(fitWidth.current * zoom)}px`",
    );
    expect(pages).toContain("}, [blob, fitKey]);");
  });
  it("goes full screen with the review bar still there", () => {
    expect(view).toContain('data-testid="full-screen"');
    expect(view).toContain('width: narrow || expanded ? "100%" : width');
    expect(view.indexOf('data-testid="review-bar"')).toBeGreaterThan(
      view.indexOf("<PdfPages"),
    );
  });
  it("Escape leaves full screen before closing", () =>
    expect(view).toContain("if (expanded) setExpanded(false);"));
});

describe("move from inside the preview", () => {
  it("shows Move to directly left of Reject", () => {
    const bar = view.slice(view.indexOf('data-testid="review-bar"'));
    const move = bar.indexOf('data-testid="pane-move"');
    const reject = bar.indexOf("setRejecting(true)");
    expect(move).toBeGreaterThan(-1);
    expect(move).toBeLessThan(reject);
  });
  it("is wired to the real move and updates the pane's category", () => {
    expect(tab).toContain("moveTargets: moveTargets(splitDoc.category)");
    expect(tab).toContain(
      "void handleMove(id, splitDoc.filename, category).then((moved)",
    );
    expect(tab).toContain("{ ...previous, category }");
  });
});

describe("hostile PDFs", () => {
  it("pdf.js never evaluates font scripts", () =>
    expect(pages).toContain("isEvalSupported: false"));
});
