// BF_PORTAL_BLOCK_v206_BI_CONTACTS_LIST_v1
// BF_PORTAL_BLOCK_BI_ROUND8_SIDEBAR_v1 -- Outreach + Overview tabs
// removed from BI CRM per locked direction. Test now asserts the
// reduced two-tab shape (Contacts + Companies) and the absence of
// the old tabs.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/api", () => ({
  api: vi.fn(async () => []),
}));

import BICRM from "@/silos/bi/crm/BICRM";

describe("BF_PORTAL_BLOCK_v206 -- BICRM tabs", () => {
  it("Contacts tab is present and pressed by default", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    const tab = screen.getByRole("button", { name: /^contacts$/i });
    expect(tab).toHaveAttribute("aria-pressed", "true");
  });

  it("Companies tab is present and not pressed by default", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    const tab = screen.getByRole("button", { name: /^companies$/i });
    expect(tab).toHaveAttribute("aria-pressed", "false");
  });

  it("Outreach tab is no longer rendered (moved to Marketing module)", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /^outreach$/i })).not.toBeInTheDocument();
  });

  it("Overview tab is no longer rendered", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /^overview$/i })).not.toBeInTheDocument();
  });

  it("renders the Contacts list initially", () => {
    render(
      <MemoryRouter>
        <BICRM />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("bi-contacts-list")).toBeInTheDocument();
  });
});
