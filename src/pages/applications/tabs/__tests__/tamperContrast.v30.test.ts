// BF_PORTAL_TAMPER_CONTRAST_v30
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/pages/applications/tabs/DocumentsTab.tsx"),
  "utf8",
);

const fraudRow = src.slice(src.indexOf("function FraudScanRow"), src.indexOf("Signals for review only") + 200);

describe("the tamper report is readable", () => {
  it("states a colour on the signal row rather than inheriting one", () => {
    expect(fraudRow).toContain('fontSize: 13, marginBottom: 6, color: "var(--ui-text)"');
  });

  it("gives the detail sentence its own colour, not the parent's", () => {
    expect(fraudRow).toContain('<span style={{ color: "var(--ui-text)" }}> — {sig.detail}</span>');
  });

  it("no longer leaves the explanation to inherit", () => {
    // The old markup put the detail as a bare text node after </strong>, with
    // no colour anywhere on the line. That is exactly what made it invisible.
    expect(fraudRow).not.toContain("</strong> — {sig.detail}");
  });

  it("keeps severity colouring on the label so high risk still reads as red", () => {
    expect(fraudRow).toContain('sig.severity === "high" ? "#991b1b"');
    expect(fraudRow).toContain('sig.severity === "medium" ? "#92400e"');
  });

  it("does not drop a low-severity label to the panel's faintest tone", () => {
    const label = fraudRow.slice(fraudRow.indexOf('sig.severity === "high"'), fraudRow.indexOf("{sig.label}"));
    expect(label).not.toContain('"var(--ui-text-muted)"');
  });
});

describe("the surrounding panel is unchanged", () => {
  it("still explains that signals are not a verdict", () => {
    expect(src).toContain("Signals for review only — not a verdict. Staff decide.");
  });

  it("still shows the reason count toggle", () => {
    expect(src).toContain('data-testid="doc-fraud-toggle"');
    expect(src).toContain('data-testid="doc-fraud-badge"');
  });
});
