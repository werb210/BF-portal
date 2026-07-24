import { describe, expect, it } from "vitest";
import source from "../FindATimePanel.tsx?raw";

describe("Find a time date and scroll v1", () => {
  it("has date controls and no horizontal scroll container", () => {
    expect(source).toContain('aria-label="Find a time date"');
    expect(source).not.toContain('overflowX: "auto"');
    expect(source).toContain("Prev");
    expect(source).toContain("Next");
    expect(source).toContain("Today");
  });

  it("shows a visible teammate name and keeps the address in the tooltip", () => {
    expect(source).toContain('title={m.email}');
    expect(source).toContain('color: "var(--ui-text-primary, #0f172a)"');
    expect(source).toContain('m.name && m.name.trim() ? m.name : m.email');
  });
});
