import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import App from "@/App";
import LoginPage from "@/pages/login/LoginPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import LendersPage from "@/pages/lenders/LendersPage";
import LenderProductsPage from "@/pages/lenders/LenderProductsPage";
import { renderWithProviders } from "@/test/testUtils";

vi.mock("@/hooks/useApiHealthCheck", () => ({
  useApiHealthCheck: () => undefined
}));

vi.mock("@/utils/routeAudit", () => ({
  runRouteAudit: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@/utils/backgroundSyncQueue", () => ({
  registerBackgroundSync: vi.fn().mockResolvedValue(undefined),
  flushQueuedMutations: vi.fn().mockResolvedValue(undefined)
}));

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

describe("staff portal smoke checks", () => {
  it("renders the app shell", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: /staff login/i })).toBeInTheDocument();
  });

  it("renders the login page", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /staff login/i })).toBeInTheDocument();
  });

  it("loads the settings page", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });

  it("loads the lenders page", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/lenders"]}>
        <Routes>
          <Route path="/lenders" element={<LendersPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Lenders")).toBeInTheDocument();
  });

  it("loads the products page", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/lender-products"]}>
        <Routes>
          <Route path="/lender-products" element={<LenderProductsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole("heading", { name: /lender products/i })).toBeInTheDocument();
  });

  it("renders core pages without runtime errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    renderWithProviders(
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    );

    renderWithProviders(
      <MemoryRouter initialEntries={["/lenders"]}>
        <Routes>
          <Route path="/lenders" element={<LendersPage />} />
        </Routes>
      </MemoryRouter>
    );

    renderWithProviders(
      <MemoryRouter initialEntries={["/lender-products"]}>
        <Routes>
          <Route path="/lender-products" element={<LenderProductsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
