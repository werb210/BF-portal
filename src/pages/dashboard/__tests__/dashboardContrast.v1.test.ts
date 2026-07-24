import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("dashboard contrast v1", () => {
  it("sets a readable foreground on drawer sections", () => {
    const css = read("src/styles/globals.css");

    expect(css).toContain("BF_PORTAL_DASHBOARD_CONTRAST_v1");
    expect(css).toMatch(/\.drawer-section\s*\{[\s\S]*background:\s*var\(--ui-surface-muted\);[\s\S]*color:\s*var\(--ui-text\);/);
  });

  it("styles dashboard stat values and hints explicitly", () => {
    const source = read("src/pages/dashboard/DashboardAnalytics.tsx");

    expect(source).toContain("const statValue");
    expect(source).toContain("const statHint");
    expect(source).toMatch(/fontSize:\s*24/);
    expect(source).toContain("<strong style={statValue}>{fmt(f.visits)}</strong>");
    expect(source).toContain("<small style={statHint}>");
  });
});
