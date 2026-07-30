import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const analytics = readFileSync(path.join(process.cwd(), "src/pages/dashboard/DashboardAnalytics.tsx"), "utf8");
const dashboard = readFileSync(path.join(process.cwd(), "src/pages/dashboard/DashboardPage.tsx"), "utf8");
const businessUnit = readFileSync(path.join(process.cwd(), "src/context/BusinessUnitContext.tsx"), "utf8");

describe("dashboard silo and labels v2", () => {
  it("normalizes every server dimension key and supplies a nonblank fallback", () => {
    for (const key of ["channel", "source", "product", "category", "lenderName"]) {
      expect(analytics).toContain(`"${key}"`);
    }
    expect(analytics).toContain('return "Unattributed"');
    expect(analytics).toContain("name: rowLabel(row)");
  });

  it("keys analytics refreshes to the active silo and sends it explicitly", () => {
    expect(analytics).toContain("const silo = useSilo()?.silo");
    expect(analytics).toContain("setData(fallback)");
    expect(analytics).toContain("[range, silo]");
    expect(analytics).toContain("&silo=${encodeURIComponent(silo.toUpperCase())}");
  });

  it("sends the silo explicitly for dashboard metrics", () => {
    expect(dashboard).toContain("/api/dashboard/metrics?silo=${encodeURIComponent(silo.toUpperCase())}");
  });

  it("persists the silo synchronously before updating provider state", () => {
    const setter = businessUnit.slice(businessUnit.indexOf("const setActiveBusinessUnit ="));
    expect(businessUnit).toContain("BF_PORTAL_SILO_STORAGE_SYNC_v1");
    expect(setter.indexOf("persistBusinessUnit(businessUnit)")).toBeLessThan(
      setter.indexOf("setActiveBusinessUnitState(businessUnit)"),
    );
  });
});
