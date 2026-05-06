// BF_PORTAL_BLOCK_v167_SELECTOR_TEST_FIX_v1
// Updated for v166 button selector. The control is now:
//   role="group" aria-label="Active silo"
//     button[aria-pressed=true]  → active silo
//     button[aria-pressed=false] → inactive silos
// SLF was hidden in v165/v166, so it's no longer rendered.
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";

vi.mock("@/hooks/useSilo", () => ({
  useSilo: () => ({ silo: "bf", setSilo: vi.fn() }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("BusinessUnitSelector", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders a button group when the user can switch silos", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "staff", silos: ["BF", "BI"] },
    });
    render(<BusinessUnitSelector />);
    const group = screen.getByRole("group", { name: /active silo/i });
    expect(group).toBeInTheDocument();
    // Two buttons: Financial + Insurance
    expect(screen.getByRole("button", { name: /financial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /insurance/i })).toBeInTheDocument();
  });

  it("renders both BF and BI buttons for admins (SLF removed in v165/v166)", () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin" } });
    render(<BusinessUnitSelector />);
    expect(screen.getByRole("button", { name: /financial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /insurance/i })).toBeInTheDocument();
    // SLF is intentionally NOT rendered.
    expect(screen.queryByRole("button", { name: /site level/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^slf$/i })).not.toBeInTheDocument();
  });

  it("marks the active silo with aria-pressed=true and others with aria-pressed=false", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "staff", silos: ["BF", "BI"] },
    });
    render(<BusinessUnitSelector />);
    const financial = screen.getByRole("button", { name: /financial/i });
    const insurance = screen.getByRole("button", { name: /insurance/i });
    expect(financial.getAttribute("aria-pressed")).toBe("true");
    expect(insurance.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders a static label when the user has only one silo", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "staff", silos: ["BF"] },
    });
    render(<BusinessUnitSelector />);
    // No group, no button — just the label.
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/boreal financial/i)).toBeInTheDocument();
  });
});
