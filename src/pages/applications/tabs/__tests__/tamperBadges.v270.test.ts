// BF_PORTAL_TAMPER_BADGES_v270
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { tamperBadge } from "../tamperBadges";

const signals = [
  { code: "incremental_saves", label: "Saved 3 times after creation", severity: "medium", detail: "3 %%EOF markers" },
  { code: "suspect_producer", label: "Made with an online PDF editor", severity: "high", detail: "Producer: iLovePDF" },
];

describe("tamper badge", () => {
  it("leads with the most serious reason and lists every signal on hover", () => {
    const b = tamperBadge({ tamperLevel: "high", tamperSignals: signals })!;
    expect(b.tone).toBe("high");
    expect(b.text).toBe("⚠ Check document: Made with an online PDF editor");
    expect(b.detail).toContain("Saved 3 times after creation");
    expect(b.detail).toContain("not a finding of fraud");
  });
  it("stays quiet for clean, low, unavailable, error, or no scan yet", () => {
    for (const level of ["clean", "low", "unavailable", "error", null, undefined]) {
      expect(tamperBadge({ tamperLevel: level as any, tamperSignals: signals })).toBeNull();
    }
  });
  it("copes with a medium result that has no signal details", () => {
    expect(tamperBadge({ tamperLevel: "medium", tamperSignals: null })?.text).toBe("⚠ Check document");
  });
});

describe("wiring", () => {
  const root = path.resolve(__dirname, "../../../../..");
  const tab = fs.readFileSync(path.join(root, "src/pages/applications/tabs/DocumentsTab.tsx"), "utf8");
  const view = fs.readFileSync(path.join(root, "src/components/applications/DocumentSplitView.tsx"), "utf8");
  it("rows show the badge and the accepted name with the uploaded filename", () => {
    expect(tab).toContain('data-testid="tamper-badge"');
    expect(tab).toContain("{doc.displayName ?? v_friendlyDocName(doc)}");
    expect(tab).toContain('data-testid="original-filename"');
  });
  it("the preview pane shows tamper, misfiled and moved notices under the title", () => {
    expect(tab).toContain("[tamperBadge(row)?.text, misfiledBadgeText(row), autoMovedText(row)]");
    expect(view).toContain('data-testid="split-view-notice"');
  });
});
