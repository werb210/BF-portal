// BF_PORTAL_DASHBOARD_BOARD_v730
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
describe("Dashboard route", () => {
  it("/portal shows the movable Dashboard", () => {
    expect(readFileSync("src/App.tsx", "utf8")).toContain('<Route path="/portal/*" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />');
  });
});
