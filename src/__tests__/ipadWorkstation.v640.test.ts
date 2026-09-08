// BF_PORTAL_BLOCK_v640_IPAD_WORKSTATION_v1
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildShortcuts } from "@/hooks/useKeyboardShortcuts";

const plist = fs.readFileSync(path.resolve(__dirname, "../../ios/App/App/Info.plist"), "utf8");

describe("iPad multitasking is enabled", () => {
  it("does not require full screen", () => {
    // iPadOS silently disables Split View and Stage Manager if this is true.
    expect(plist).toMatch(/<key>UIRequiresFullScreen<\/key>\s*<false\/>/);
  });

  it("supports multiple scenes for Stage Manager", () => {
    expect(plist).toMatch(/<key>UIApplicationSupportsMultipleScenes<\/key>\s*<true\/>/);
  });

  it("declares all four iPad orientations", () => {
    const ipad = plist.split("UISupportedInterfaceOrientations~ipad")[1] ?? "";
    for (const o of ["Portrait", "PortraitUpsideDown", "LandscapeLeft", "LandscapeRight"]) {
      expect(ipad).toContain(`UIInterfaceOrientation${o}`);
    }
  });

  it("no longer claims armv7", () => {
    expect(plist).not.toContain("armv7");
  });
});

describe("keyboard shortcuts", () => {
  it("routes each navigation shortcut to a distinct path", () => {
    const seen: string[] = [];
    const shortcuts = buildShortcuts((to) => seen.push(to), () => {});
    shortcuts.filter((s) => s.keys.startsWith("g ")).forEach((s) => s.run());
    expect(seen).toEqual(["/portal", "/pipeline", "/crm/contacts", "/communications", "/tasks"]);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("exposes a help entry so the set is discoverable", () => {
    expect(buildShortcuts(() => {}, () => {}).some((s) => s.keys === "?")).toBe(true);
  });
});
