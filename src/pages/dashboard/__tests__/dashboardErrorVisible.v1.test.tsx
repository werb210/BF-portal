// BF_PORTAL_DASHBOARD_ERROR_VISIBLE_v1
import { describe, expect, it } from "vitest";
import src from "../DashboardPage.tsx?raw";

describe("dashboard load failures remain distinct from an empty pipeline", () => {
  it("records a failed metrics request and offers a retry", () => {
    expect(src).toContain("const [loadFailed, setLoadFailed] = useState(false)");
    expect(src).toContain("Couldn't load dashboard data");
    expect(src).toContain("Retry");
    expect(src).toContain("onClick={() => void loadDashboard()}");
  });

  it("only announces an empty pipeline after metrics loaded", () => {
    expect(src).toContain("metrics !== null && stages.length === 0");
    expect(src).toContain("No applications in the pipeline yet.");
  });
});
