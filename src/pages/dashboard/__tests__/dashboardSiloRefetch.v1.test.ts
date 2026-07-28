// BF_PORTAL_DASHBOARD_SILO_REFETCH_v1
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(path.join(process.cwd(), "src/pages/dashboard/DashboardPage.tsx"), "utf8");

describe("dashboard refetches when the business unit changes", () => {
  it("reads the active silo", () => {
    expect(src).toContain('import { useSilo } from "@/context/SiloContext";');
    expect(src).toContain('const silo = useSilo()?.silo ?? "BF";');
  });
  it("keys the fetch to the silo instead of an empty dep array", () => {
    const seg = src.slice(src.indexOf("const loadDashboard = useCallback("), src.indexOf("if (isLoading)"));
    expect(seg).toContain("}, [silo]);");
    expect(seg).toContain("setMetrics(null);");
  });
});
