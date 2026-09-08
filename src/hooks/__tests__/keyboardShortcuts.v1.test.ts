// BF_PORTAL_SHORTCUTS_MOUNT_v1
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildShortcuts } from "../useKeyboardShortcuts";

const app = fs.readFileSync(path.resolve(__dirname, "../../App.tsx"), "utf8");

/** Every path the router can match, including wildcard prefixes. */
function routePaths(): string[] {
  return [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
}

describe("keyboard shortcuts", () => {
  it("is actually mounted", () => {
    // v640 shipped the hook and never called it.
    expect(app).toContain("useKeyboardShortcuts(");
    expect(app).toContain("<ShortcutHelp");
  });

  it("navigates only to routes that exist", () => {
    const paths = routePaths();
    const targets: string[] = [];
    buildShortcuts((to) => targets.push(to), () => {}).forEach((s) => s.run());

    for (const target of targets) {
      const matched = paths.some(
        (p) => p === target || (p.endsWith("/*") && target.startsWith(p.slice(0, -2))),
      );
      expect(matched, `${target} matches no route in App.tsx`).toBe(true);
    }
  });

  it("keeps every navigation target distinct", () => {
    const targets: string[] = [];
    buildShortcuts((to) => targets.push(to), () => {}).forEach((s) => s.run());
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("offers a discoverable help entry", () => {
    expect(buildShortcuts(() => {}, () => {}).some((s) => s.keys === "?")).toBe(true);
  });
});
