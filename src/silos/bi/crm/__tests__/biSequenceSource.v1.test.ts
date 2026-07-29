// BF_PORTAL_BI_SEQUENCE_SOURCE_v1
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const outreach = readFileSync(path.join(process.cwd(), "src/silos/bi/crm/BIOutreach.tsx"), "utf8");

// The shape the endpoint actually returns: a UNION of portal and Apollo rows.
const payload = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Reactivation", status: "draft", source: "portal" },
  { id: "apollo-seq-1", name: "Lawyers", status: "active", source: "apollo" },
  { id: "apollo-seq-2", name: "LinkedIn", status: "paused", source: "apollo" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Old one", status: "archived", source: "portal" },
];
const visible = payload
  .filter((s) => (s.source ?? "portal") === "portal")
  .filter((s) => s.status !== "archived");

describe("only portal-built sequences are enrollable", () => {
  it("drops Apollo rows, whose ids the enrol route cannot resolve", () => {
    expect(visible.map((s) => s.name)).toEqual(["Reactivation"]);
    expect(visible.some((s) => s.id.startsWith("apollo-"))).toBe(false);
  });
  it("treats a row with no source as portal, so nothing legitimate is hidden", () => {
    const legacy = [{ id: "x", name: "Legacy", status: "draft" } as { id: string; name: string; status: string; source?: string }];
    expect(legacy.filter((s) => (s.source ?? "portal") === "portal")).toHaveLength(1);
  });
  it("applies the same filter in the component", () => {
    expect(outreach).toContain('(sequence.source ?? "portal") === "portal"');
  });
  it("says so rather than offering an empty picker", () => {
    expect(outreach).toContain("No sequences yet — build one in Marketing");
  });
});
