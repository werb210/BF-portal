// BF_PORTAL_NEGATIVES_UNDO_v435
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const panel = readFileSync(
  path.join(process.cwd(), "src/pages/diagnostics/NegativesPanel.tsx"), "utf8");

describe("v435 an applied negative can be undone from the panel", () => {
  it("reads the audit list v419 exposes", () => {
    expect(panel).toContain("/api/marketing/negative-keywords/recent");
  });

  it("removes through the server, not just the local list", () => {
    expect(panel).toContain("/remove");
    expect(panel).toContain("encodeURIComponent(row.id)");
  });

  it("refreshes the candidate list so the term can come back", () => {
    expect(panel).toContain("setApplied((previous) => previous.filter");
    expect(panel).toContain("      load();");
  });

  it("refreshes the applied list after an add", () => {
    expect(panel).toContain("loadApplied();");
  });

  it("disables undo when Google gave us no handle to remove it with", () => {
    expect(panel).toContain("disabled={removing === row.id || !row.resource_name}");
    expect(panel).toContain("remove it in Google Ads");
  });

  it("describes the block in plain words, not PHRASE and EXACT", () => {
    expect(panel).toContain("anything containing it");
    expect(panel).toContain("only this exact search");
  });
});
