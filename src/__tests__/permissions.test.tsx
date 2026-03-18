// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderWithProviders } from "@/test/testUtils";
import LendersPage from "@/pages/lenders/LendersPage";
import MarketingPage from "@/pages/marketing/MarketingPage";
import PrivateRoute from "@/router/PrivateRoute";
import { fetchLenders } from "@/api/lenders";

vi.mock("@/api/lenders", () => ({
  fetchLenders: vi.fn().mockResolvedValue([])
}));

describe("permission-aware rendering", () => {
  it("shows a block message for unauthorized roles", () => {
    renderWithProviders(<MarketingPage />, {
      auth: {
        user: { id: "u-1", name: "Staff User", email: "staff@example.com", role: "Staff" },
        authState: "authenticated",
        authStatus: "authenticated",
        rolesStatus: "resolved",
        authenticated: true,
        authReady: true
      }
    });

    expect(screen.getByText("Access restricted")).toBeInTheDocument();
    expect(screen.getByText("This space is limited to Admins.")).toBeInTheDocument();
  });

  it("does not fire API calls when the role is insufficient", () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    renderWithProviders(
      <MemoryRouter initialEntries={["/lenders"]}>
        <Routes>
          <Route path="/lenders/*" element={<LendersPage />} />
        </Routes>
      </MemoryRouter>,
      {
        auth: {
          user: { id: "u-2", name: "Lender User", email: "lender@example.com", role: "Lender" },
          authState: "authenticated",
          authStatus: "authenticated",
          rolesStatus: "resolved",
          authenticated: true,
          authReady: true
        }
      }
    );

    expect(screen.getByText("Access restricted")).toBeInTheDocument();
    expect(fetchLendersMock).not.toHaveBeenCalled();
  });

  it("renders route content when a token exists, even if roles lack Admin/Staff", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={["Admin", "Staff"]}>
                <div>Dashboard</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
      {
        auth: {
          user: { id: "u-3", name: "Referrer User", email: "referrer@example.com", role: "Referrer" },
          authState: "authenticated",
          authStatus: "authenticated",
          rolesStatus: "resolved",
          authenticated: true,
          authReady: true
        }
      }
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
