// BF_PORTAL_BF_REFERRER_MANAGEMENT_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
// BF_PORTAL_PARTNERS_TABS_v720 - Referrers / Brokers sub-tabs; stubbed for the dashboard test.
vi.mock("../ReferrersAndBrokers", () => ({ default: () => <div>referrers-and-brokers</div> }));

import BFReferrerManagement from "../BFReferrerManagement";
import MarketingDashboard from "../MarketingDashboard";

function allPaths(): string[] {
  const fns = [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete];
  return fns.flatMap((f) => f.mock.calls.map((c: unknown[]) => String(c[0])));
}

beforeEach(() => {
  for (const f of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) {
    f.mockReset();
    f.mockResolvedValue({});
  }
});

describe("BF Referrer Management (v1)", () => {
  it("uses BF endpoints, not BI", async () => {
    h.apiFn.mockImplementation(async (path: string) =>
      path === "/api/admin/referrers"
        ? { referrers: [{ id: "r1", full_name: "Jane Referrer", referrals_count: 3, matched_count: 1 }] }
        : {},
    );
    render(<BFReferrerManagement />);
    expect(await screen.findByText("Jane Referrer")).toBeInTheDocument();
    expect(h.apiFn).toHaveBeenCalledWith("/api/admin/referrers");
    expect(allPaths().some((p) => p.includes("/api/v1/bi/"))).toBe(false);
  });

  it("is added as a Referrers tab in Marketing", async () => {
    render(
      <MemoryRouter>
        <MarketingDashboard />
      </MemoryRouter>,
    );
    expect(screen.queryByText("referrers-and-brokers")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Referrers" }));
    await waitFor(() => expect(screen.getByText("referrers-and-brokers")).toBeInTheDocument());
  });
});
