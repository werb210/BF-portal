// BF_PORTAL_BLOCK_v167_SELECTOR_TEST_FIX_v1
// BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1 — selector now calls
// useNavigate() after setSilo, so every render needs a Router wrapper.
// Updated for v166 button selector. The control is:
//   role="group" aria-label="Active silo"
//     button[aria-pressed=true]  → active silo
//     button[aria-pressed=false] → inactive silos
// SLF is shown again for admins (re-added to the selector).
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";

vi.mock("@/hooks/useSilo", () => ({
  useSilo: () => ({ silo: "bf", setSilo: vi.fn() }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1 — every render goes through
// this helper so the Router context is present for useNavigate().
function renderSelector() {
  return render(
    <MemoryRouter>
      <BusinessUnitSelector />
    </MemoryRouter>,
  );
}

describe("BusinessUnitSelector", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders a button group when the user can switch silos", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "staff", silos: ["BF", "BI"] },
    });
    renderSelector();
    const group = screen.getByRole("group", { name: /active silo/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /financial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /insurance/i })).toBeInTheDocument();
  });

  // BF_PORTAL_BLOCK_v_SLF_SELECTOR_TEST_FIX_v1 — SLF is shown again for admins.
  it("renders BF, BI, and SLF buttons for admins", () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin" } });
    renderSelector();
    expect(screen.getByRole("button", { name: /financial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /insurance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^slf$/i })).toBeInTheDocument();
  });

  it("marks the active silo with aria-pressed=true and others with aria-pressed=false", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "staff", silos: ["BF", "BI"] },
    });
    renderSelector();
    const financial = screen.getByRole("button", { name: /financial/i });
    const insurance = screen.getByRole("button", { name: /insurance/i });
    expect(financial.getAttribute("aria-pressed")).toBe("true");
    expect(insurance.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders a static label when the user has only one silo", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "staff", silos: ["BF"] },
    });
    renderSelector();
    expect(screen.queryByRole("group", { name: /active silo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Boreal Financial/i)).toBeInTheDocument();
  });
});
