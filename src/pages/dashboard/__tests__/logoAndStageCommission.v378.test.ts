// BF_PORTAL_LOGO_FILL_v378 / BF_PORTAL_STAGE_COMMISSION_LINES_v378
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(join(process.cwd(), "src/layouts/AppLayout.tsx"), "utf8");
const dash = readFileSync(join(process.cwd(), "src/pages/dashboard/DashboardPage.tsx"), "utf8");

describe("sidebar logo fills its space", () => {
  it("crops the padded canvas to the logo band at full sidebar width", () => {
    expect(layout).toContain('data-testid="sidebar-logo"');
    expect(layout).toContain('aspectRatio: "855 / 250"');
    expect(layout).toContain('width: "179.65%"');
    expect(layout).not.toContain('style={{ height: 52, width: "auto" }}');
  });
});

describe("stage commission shows one currency per line", () => {
  it("no dot separator", () => {
    expect(dash).toContain('parts.join("\\n")');
    expect(dash).not.toContain('parts.join(" · ")');
    expect(dash).toContain('whiteSpace: "pre-line"');
  });
});
