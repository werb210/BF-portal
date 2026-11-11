// BF_PORTAL_v942_DEALS_AND_PAY / BF_PORTAL_v942_BROKER_PAY
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ role: "Staff", api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/api", () => ({ api: h.api, default: h.api }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: h.role } }) }));
vi.mock("@/pages/reports/ReportDataCards", () => ({ ReportDataCard: () => <div data-testid="card" /> }));
vi.mock("@/features/activeContracts/PortfolioReport", () => ({ default: () => <div /> }));

import RevenuePage from "../RevenuePage";
import BrokerPaySettings from "@/pages/settings/BrokerPaySettings";

const revenue = { ok: true, scope: "broker", totals: { funded: 250000, expected: 5000, received: 0, outstanding: 5000, clawed_back: 0, referral_owed: 1000 },
  closes: [{ id: "c1", application_id: "app-1", closed_on: "2026-11-11", currency: "CAD", funded_amount: 250000, lender_name: "Northern Capital", broker_user_id: "u1", broker_name: "Sam Broker", business: "Acme Ltd", status: "open" }],
  lines: [{ id: "l1", close_id: "c1", kind: "lender_commission", description: null, expected_amount: 5000, received_amount: null, received_on: null, month: null, status: "expected" }] };
const statement = { user_id: "u1", pay_date: "2026-11-30", window: { from: "2026-11-01", to: "2026-11-15" }, net_revenue: 4000, funded_volume: 250000, deals: 1, rate_pct: 50,
  lines: [{ kind: "commission", text: "Acme Ltd: 50% of $4,000", amount: 2000 }], total: 2000, draw_balance_after: 0 };

beforeEach(() => { for (const k of Object.keys(h.api) as Array<keyof typeof h.api>) h.api[k].mockReset(); localStorage.clear(); });

describe("Revenue > Deals & pay", () => {
  it("a broker sees only the Deals & pay view with their own numbers, no broker picker", async () => {
    h.role = "Staff";
    h.api.get.mockImplementation(async (url: string) => (url.startsWith("/api/deals/revenue") ? revenue : { statements: [statement], pay_date: "2026-11-30" }));
    render(<MemoryRouter><RevenuePage /></MemoryRouter>);
    expect(await screen.findByTestId("deal-c1")).toHaveTextContent("Acme Ltd");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByLabelText("Broker")).toBeNull();
    expect(screen.getByText("Your deals and pay only.")).toBeInTheDocument();
    expect(await screen.findByTestId("statement-total-u1")).toHaveTextContent("$2,000");
    expect(h.api.get).not.toHaveBeenCalledWith("/api/deals/pay-settings");
    for (const [url] of h.api.get.mock.calls) expect(String(url)).not.toMatch(/broker=|user=/);
  });

  it("an admin can narrow to one broker", async () => {
    h.role = "Admin";
    localStorage.setItem("bf.revenue.tab", "deals");
    h.api.get.mockImplementation(async (url: string) => (url === "/api/deals/pay-settings" ? { people: [{ id: "u1", name: "Sam Broker" }] }
      : url.startsWith("/api/deals/revenue") ? revenue : { statements: [statement], pay_date: "2026-11-30" }));
    render(<MemoryRouter><RevenuePage /></MemoryRouter>);
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    fireEvent.change(await screen.findByLabelText("Broker"), { target: { value: "u1" } });
    await waitFor(() => expect(h.api.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/deals\/revenue\?.*broker=u1/)));
    await waitFor(() => expect(h.api.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/deals\/statements\?.*user=u1/)));
  });
});

describe("Settings > Broker pay", () => {
  it("saves a broker's split and adds a bonus", async () => {
    h.api.get.mockResolvedValue({ settings: { schedule: "semi_monthly", tier_basis: "revenue", tier_mode: "marginal" }, plans: [], bonuses: [], people: [{ id: "u1", name: "Sam Broker", role: "Staff" }] });
    h.api.put.mockResolvedValue({ ok: true });
    h.api.post.mockResolvedValue({ ok: true });
    render(<BrokerPaySettings />);
    fireEvent.change(await screen.findByLabelText("Company leads % for Sam Broker"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("Self-sourced % for Sam Broker"), { target: { value: "60" } });
    fireEvent.click(screen.getByTestId("pay-save-u1"));
    await waitFor(() => expect(h.api.put).toHaveBeenCalledWith("/api/deals/pay-plans/u1", expect.objectContaining({ split_company_pct: 40, split_self_pct: 60, residual_share: true })));
    fireEvent.change(screen.getByLabelText("Bonus name"), { target: { value: "Deal bonus" } });
    fireEvent.change(screen.getByLabelText("Bonus amount"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: "Add bonus" }));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/deals/bonus-rules", { name: "Deal bonus", kind: "per_deal", amount: "250", threshold: "" }));
  });
});
