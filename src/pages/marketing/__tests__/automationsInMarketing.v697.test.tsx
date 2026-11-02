// BF_PORTAL_AUTOMATIONS_IN_MARKETING_v697, BF_PORTAL_v864_CONTENT_TAB
// The automation builder and the built-in system rules moved from Marketing > Automations to Settings > Content >
// Automations. Old Marketing links (?tab=automations) forward there.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/api", () => ({ api: Object.assign(vi.fn(async () => ({})), { get: vi.fn(async () => ({ items: [] })), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }) }));

import MarketingDashboard from "@/pages/marketing/MarketingDashboard";

describe("Marketing > Automations moved to Settings > Content", () => {
  it("Marketing no longer has an Automations tab", () => {
    window.history.replaceState(null, "", "/marketing");
    render(<MemoryRouter><MarketingDashboard /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Automations" })).toBeNull();
  });
  it("?tab=automations forwards to Settings > Content > Automations", async () => {
    window.history.replaceState(null, "", "/marketing?tab=automations");
    render(
      <MemoryRouter initialEntries={["/marketing?tab=automations"]}>
        <Routes>
          <Route path="/marketing" element={<MarketingDashboard />} />
          <Route path="/settings/content" element={<div data-testid="content-page" />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("content-page")).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });
});
