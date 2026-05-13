// BF_PORTAL_BLOCK_v202_OUTREACH_UI_v1
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/api", () => ({
  api: vi.fn(async (path: string) => {
    if (path.startsWith("/api/v1/bi/crm/outreach/contacts")) {
      return { contacts: [] };
    }
    if (path.includes("/me/profile")) {
      return { profile: null, exists: false };
    }
    return [];
  }),
}));

import BICRM from "@/silos/bi/crm/BICRM";

describe("BF_PORTAL_BLOCK_v202_OUTREACH_UI_v1 — BICRM tabs", () => {
  it("renders the Outreach tab by default", () => {
    render(<BICRM />);
    expect(
      screen.getByRole("button", { name: /^outreach$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("bi-outreach")).toBeInTheDocument();
  });

  it("Overview tab is present and not pressed initially", () => {
    render(<BICRM />);
    const overview = screen.getByRole("button", { name: /^overview$/i });
    expect(overview).toHaveAttribute("aria-pressed", "false");
  });
});
