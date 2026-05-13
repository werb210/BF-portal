// BF_PORTAL_BLOCK_v206_BI_CONTACTS_LIST_v1
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/api", () => ({
  api: vi.fn(async () => []),
}));

import BICRM from "@/silos/bi/crm/BICRM";

describe("BF_PORTAL_BLOCK_v206 — BICRM Contacts tab", () => {
  it("Contacts tab is present and pressed by default", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    const tab = screen.getByRole("button", { name: /^contacts$/i });
    expect(tab).toHaveAttribute("aria-pressed", "true");
  });

  it("Outreach tab is present and not pressed by default", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    const tab = screen.getByRole("button", { name: /^outreach$/i });
    expect(tab).toHaveAttribute("aria-pressed", "false");
  });

  it("renders the Contacts list initially (not Overview, not Outreach)", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("bi-contacts-list")).toBeInTheDocument();
  });
});
