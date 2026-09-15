// BF_PORTAL_SPLIT_VIEW_v205
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const view = readFileSync(
  "src/components/applications/DocumentSplitView.tsx",
  "utf-8",
);
const tab = readFileSync(
  "src/pages/applications/tabs/DocumentsTab.tsx",
  "utf-8",
);

describe("split view", () => {
  it("docks beside the page rather than covering it", () => {
    expect(view).toContain('position: "fixed"');
    expect(view).toContain("right: 0");
    expect(view).not.toMatch(/left: 0,\s*right: 0/);
  });

  it("cannot be resized to nothing on either side", () => {
    expect(view).toContain("MIN_PANE = 320");
    expect(view).toMatch(
      /Math\.min\([\s\S]{0,160}Math\.max\(window\.innerWidth - event\.clientX, MIN_PANE\)/,
    );
  });

  it("closes on Escape", () => {
    expect(view).toContain('event.key === "Escape"');
  });

  it("never leaves the page unselectable if it unmounts mid-drag", () => {
    const cleanup = view.slice(
      view.indexOf("return () => {", view.indexOf("mousemove")),
    );
    expect(cleanup).toContain('document.body.style.userSelect = ""');
    expect(cleanup).toContain('document.body.style.cursor = ""');
  });

  it("falls back visibly when the browser cannot render the type", () => {
    expect(view).toContain("<PdfPages");
    expect(view).toContain("This file type cannot be shown here");
  });

  it("keeps the width for the session only", () => {
    expect(view).toContain("sessionStorage");
    expect(view).not.toContain("localStorage");
  });
});

describe("documents tab", () => {
  it("no longer opens preview in a new tab", () => {
    expect(tab).not.toContain('window.open(objectUrl, "_blank"');
  });

  it("releases the previous blob before showing another", () => {
    expect(
      tab.match(/URL\.revokeObjectURL\(previous\.url\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("mounts the pane", () => {
    expect(tab).toContain("BF_PORTAL_SPLIT_VIEW_v205");
    expect(tab).toContain("<DocumentSplitView");
  });
});
