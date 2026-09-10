// BF_PORTAL_DIAGNOSTICS_NAV_v2
// The diagnostics page shipped with a working route, a page file and tests,
// and was still unreachable: its nav entry went into a group that does not
// render. A route with no reachable link is not shipped.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sidebar = readFileSync(resolve(__dirname, "..", "Sidebar.tsx"), "utf-8");
const app = readFileSync(
  resolve(__dirname, "..", "..", "..", "App.tsx"),
  "utf-8",
);

describe("BF_PORTAL_DIAGNOSTICS_NAV_v2", () => {
  it("is routed", () => {
    expect(app).toContain('path="/diagnostics"');
  });

  it("appears exactly once in the sidebar", () => {
    expect(sidebar.match(/path: "\/diagnostics"/g)?.length ?? 0).toBe(1);
  });

  it("sits in the same nav group as Settings, which is known to render", () => {
    const home = sidebar.match(
      /\{\s*items:\s*\[([\s\S]*?)\],?\s*\},\s*\{\s*title:/,
    )?.[1];
    expect(
      home,
      "no primary nav group precedes the titled groups",
    ).toBeTruthy();
    expect(home).toContain('path: "/settings"');
    expect(
      home!.includes('path: "/diagnostics"'),
      "Diagnostics is in a different group from Settings. It was filed under " +
        "'AI & Support' once before and never appeared on screen.",
    ).toBe(true);
  });
});
