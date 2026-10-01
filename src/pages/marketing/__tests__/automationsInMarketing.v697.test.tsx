// BF_PORTAL_AUTOMATIONS_IN_MARKETING_v697
// The automation builder and its starter automations were only reachable at /admin/automations,
// which the live menu never links to. They now sit on Marketing > Automations.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Marketing > Automations shows the builder", () => {
  const src = readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8");
  it("mounts the builder above the built-in rules", () => {
    expect(src).toContain('import AutomationsBuilder from "@/pages/admin/AutomationsPage"');
    expect(src).toContain('{tab === "automations" && (<><AutomationsBuilder /><AutomationsPanel /></>)}');
  });
  it("no longer says a builder is coming", () => {
    expect(src).not.toContain("a builder to create your own is coming");
    expect(src).toContain("Built-in system rules");
  });
});
