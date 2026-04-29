// BF_PORTAL_BI_SILO_NAV_v56 — regression for the BI silo nav config.
// Asserts BI users see Pipeline + Lenders, do NOT see Communications +
// Calendar, and that BF nav is unchanged.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

const useAuthMock = vi.fn();
const useSiloMock = vi.fn();

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useSilo", () => ({
  useSilo: () => useSiloMock(),
}));

vi.mock("@/components/layout/Topbar", () => ({
  default: () => <div data-testid="topbar-mock" />,
}));

vi.mock("@/components/maya/MayaChat", () => ({
  default: () => <div data-testid="maya-mock" />,
}));

import AppLayout from "@/layouts/AppLayout";

function renderLayout(silo: string, role: string) {
  useSiloMock.mockReturnValue({ silo });
  useAuthMock.mockReturnValue({ user: { role } });
  return render(
    <MemoryRouter>
      <AppLayout>
        <div>page</div>
      </AppLayout>
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BI_SILO_NAV_v56 — BI silo nav config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("BI silo Admin sees Pipeline and Lenders", () => {
    renderLayout("BI", "Admin");
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lenders" })).toBeInTheDocument();
  });

  it("BI silo Admin does not see Communications or Calendar", () => {
    renderLayout("BI", "Admin");
    expect(screen.queryByRole("link", { name: "Communications" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Calendar" })).not.toBeInTheDocument();
  });

  it("BF silo Admin still sees Communications and Calendar (unchanged)", () => {
    renderLayout("BF", "Admin");
    expect(screen.getByRole("link", { name: "Communications" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
  });

  it("BF silo Admin still sees Pipeline + Lenders (unchanged)", () => {
    renderLayout("BF", "Admin");
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lenders" })).toBeInTheDocument();
  });
});

// BF_PORTAL_BI_SILO_NAV_v56_APPLAYOUT_TEST_ANCHOR
