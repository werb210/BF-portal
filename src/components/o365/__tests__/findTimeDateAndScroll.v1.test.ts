import { describe, expect, it } from "vitest";
import source from "../FindATimePanel.tsx?raw";

describe("Find a time date and scroll v1", () => {
  it("has date controls and a shared horizontal scroll container", () => {
    expect(source).toContain('aria-label="Find a time date"');
    expect(source).toContain('overflowX: "auto"');
    expect(source).toContain("Prev");
    expect(source).toContain("Next");
    expect(source).toContain("Today");
  });
});
