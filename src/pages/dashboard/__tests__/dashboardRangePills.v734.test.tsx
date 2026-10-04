// BF_PORTAL_DASHBOARD_RANGE_PILLS_v734
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("@/api", () => ({ api: { get: vi.fn(async (url: string) => (url.includes("layouts") ? { tabs: [], dashboard: null } : url.includes("catalog") ? { reports: [] } : {})), put: vi.fn() } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, isLoading: false, role: "Admin" }) }));
vi.mock("@/pages/reports/ReportsBoard", () => ({ CardBody: () => null }));
import DashboardHome from "../DashboardHome";

describe("Dashboard period buttons", () => {
  it("are separate, labelled buttons and show which period is chosen", async () => {
    render(<MemoryRouter><DashboardHome /></MemoryRouter>);
    const thirty = await screen.findByRole("button", { name: "30 days" });
    expect(screen.getByText("Period:")).toBeTruthy();
    expect(thirty.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "1 year" }));
    expect(screen.getByRole("button", { name: "1 year" }).getAttribute("aria-pressed")).toBe("true");
    expect(thirty.getAttribute("aria-pressed")).toBe("false");
  });
});
