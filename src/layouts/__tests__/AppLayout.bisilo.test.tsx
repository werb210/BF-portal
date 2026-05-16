// BF_PORTAL_BI_SILO_NAV_v56 -- regression for the BI silo nav config.
// BF_PORTAL_BLOCK_BI_ROUND8_SIDEBAR_v1 -- updated for the 6-tab BI
// sidebar per ruling 21: Dashboard / Pipeline / CRM / Lender /
// Marketing / Settings. Referrer was removed from the sidebar and
// now lives as a sub-tab inside the Lender page (?tab=referrer).
// Lenders was renamed to Lender (singular) to match the route.
// BF nav is unchanged.
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

describe("BF_PORTAL_BI_SILO_NAV_v56 -- BI silo nav config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("BI silo Admin sees Pipeline and Lender (singular)", () => {
    renderLayout("BI", "Admin");
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lender" })).toBeInTheDocument();
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

  it("BF silo Admin still sees Pipeline + Lenders (BF sidebar unchanged)", () => {
    renderLayout("BF", "Admin");
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lenders" })).toBeInTheDocument();
  });
});

describe("BF_PORTAL_BLOCK_BI_ROUND8_SIDEBAR_v1 -- 6-tab BI nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Dashboard points at /silo/bi/dashboard (not /portal)", () => {
    renderLayout("BI", "Admin");
    expect(
      screen.getByRole("link", { name: "Dashboard" }).getAttribute("href"),
    ).toBe("/silo/bi/dashboard");
  });

  it("Lender points at /silo/bi/lender (renamed from Lenders, not legacy /bi-lenders)", () => {
    renderLayout("BI", "Admin");
    expect(
      screen.getByRole("link", { name: "Lender" }).getAttribute("href"),
    ).toBe("/silo/bi/lender");
  });

  it("CRM link replaces the old Contacts link, points at /silo/bi/crm", () => {
    renderLayout("BI", "Admin");
    expect(
      screen.getByRole("link", { name: "CRM" }).getAttribute("href"),
    ).toBe("/silo/bi/crm");
  });

  it("Marketing points at /silo/bi/marketing (not BF /marketing)", () => {
    renderLayout("BI", "Admin");
    expect(
      screen.getByRole("link", { name: "Marketing" }).getAttribute("href"),
    ).toBe("/silo/bi/marketing");
  });

  it("Referrer is NO LONGER in the BI sidebar (moved into Lender sub-tab)", () => {
    renderLayout("BI", "Admin");
    expect(screen.queryByRole("link", { name: "Referrer" })).not.toBeInTheDocument();
  });

  it("BI sidebar has exactly 6 items (Dashboard, Pipeline, CRM, Lender, Marketing, Settings)", () => {
    renderLayout("BI", "Admin");
    const expectedLabels = ["Dashboard", "Pipeline", "CRM", "Lender", "Marketing", "Settings"];
    for (const label of expectedLabels) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});

// BF_PORTAL_BI_SILO_NAV_v56_APPLAYOUT_TEST_ANCHOR
