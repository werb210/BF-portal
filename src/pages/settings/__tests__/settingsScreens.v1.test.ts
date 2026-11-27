// SETTINGS_SCREENS_v1 - the Apple TV app tells people to open Settings > Screens, so that item must exist.
import { describe, expect, it, vi } from "vitest";
vi.mock("@/scoreboard/ScreensSettings", () => ({ default: () => null }));
import { SETTINGS_GROUPS } from "../SettingsPage";

describe("Settings > Screens", () => {
  it("is an item in the brokerage set-up list", () => {
    const g = SETTINGS_GROUPS.find((x) => x.sectionIds.includes("screens"));
    expect(g?.label).toBe("Screens");
    expect(g?.heading).toBe("BROKERAGE SET-UP");
  });
});
