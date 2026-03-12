import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/login/LoginPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import UserManagement from "@/pages/settings/tabs/UserManagement";
import LendersPage from "@/pages/lenders/LendersPage";
import LenderProductsPage from "@/pages/lenders/LenderProductsPage";
import { renderWithProviders } from "@/test/testUtils";

vi.mock("@/api/lenders", () => ({
  fetchLenders: vi.fn().mockResolvedValue([
    { id: "l-1", name: "Atlas Lending", active: true, status: "ACTIVE", address: { country: "US" } }
  ]),
  fetchLenderProducts: vi.fn().mockResolvedValue([]),
  createLender: vi.fn(),
  updateLender: vi.fn(),
  createLenderProduct: vi.fn(),
  updateLenderProduct: vi.fn()
}));

vi.mock("@/state/settings.store", () => ({
  useSettingsStore: () => ({
    users: [
      { id: "u-1", firstName: "Alex", lastName: "Smith", email: "alex@example.com", role: "Admin", disabled: false }
    ],
    addUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserRole: vi.fn(),
    setUserDisabled: vi.fn(),
    statusMessage: undefined,
    fetchUsers: vi.fn().mockResolvedValue(undefined),
    isLoadingUsers: false
  })
}));

describe("stability smoke tests", () => {
  it("renders the login screen", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /staff login/i })).toBeInTheDocument();
  });

  it("renders settings overview safely", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });

  it("renders user management with safe defaults", () => {
    renderWithProviders(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /user management/i })).toBeInTheDocument();
  });

  it("renders lenders page safely", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/lenders"]}>
        <Routes>
          <Route path="/lenders" element={<LendersPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Lenders")).toBeInTheDocument();
  });

  it("renders lender products page safely", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/lender-products"]}>
        <Routes>
          <Route path="/lender-products" element={<LenderProductsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole("heading", { name: /lender products/i })).toBeInTheDocument();
  });
});
