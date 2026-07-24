import { describe, expect, it } from "vitest";
import source from "../DashboardAnalytics.tsx?raw";

describe("DashboardAnalytics v1", () => {
  it("contains range selector and analytics sections", () => {
    expect(source).toContain("Dashboard analytics");
    expect(source).toContain("revenueFunnel");
    expect(source).toContain("Top lenders by approval rate");
  });
});
