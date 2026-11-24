// BF_PORTAL_DESKTOP_COLLATERAL_v1 - in the desktop app View opens an in-portal viewer, never a pop-up tab.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/api", () => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = vi.fn(async () => ({ items: [{ id: "c1", name: "Lender Guide", audience: null, doc_type: null, content_type: "application/pdf", size_bytes: 2048 }] }));
  fn.post = vi.fn(async () => ({}));
  fn.delete = vi.fn(async () => ({}));
  return { api: fn, default: fn };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Staff" } }) }));

import CollateralSettings, { isDesktopShell } from "../CollateralSettings";

afterEach(() => { delete (window as any).borealDesktop; vi.restoreAllMocks(); });

describe("collateral in the desktop app", () => {
  it("opens the PDF in a viewer inside the portal", async () => {
    (window as any).borealDesktop = {};
    expect(isDesktopShell()).toBe(true);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Blob(["%PDF"], { type: "application/pdf" }), { status: 200 }));
    (URL as any).createObjectURL = vi.fn(() => "blob:https://staff.boreal.financial/x");
    (URL as any).revokeObjectURL = vi.fn();
    render(<CollateralSettings />);
    fireEvent.click(await screen.findByTestId("collateral-view"));
    expect(await screen.findByTestId("collateral-viewer")).toBeInTheDocument();
    expect(screen.getByTitle("Lender Guide")).toHaveAttribute("src", "blob:https://staff.boreal.financial/x");
    expect(open).not.toHaveBeenCalled();
  });
});
