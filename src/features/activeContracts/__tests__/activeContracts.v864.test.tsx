// BF_PORTAL_v864_ACTIVE_CONTRACTS - the Active Contracts tab, contract detail, renewal rules editor, the third record
// tab and the Reports entry, rendered against a mocked API.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

import ActiveContractsTab from "../ActiveContractsTab";
import RenewalRulesEditor from "../RenewalRulesEditor";
import ContactRecordTabs from "@/components/crm/ContactRecordTabs";
import { withPortalReports, ACTIVE_CONTRACTS_KEY } from "@/pages/reports/reportLibrary";

const contract = {
  id: "11111111-1111-4111-8111-111111111111", silo: "BF", company_id: "c0", contact_id: null, application_id: "app1", lender_id: null, lender_product_id: null,
  lender_name: "Clearbanc", product_name: "Merchant Cash Advance", product_category: "MCA", facility_type: null, owner_user_id: null, owner_name: "Andrew Polturak",
  company_name: "De Kruyff", contact_name: null, original_amount: 150000, currency: "CAD", funded_at: "2026-04-12", term_months: null, maturity_date: null,
  interest_rate: null, factor_rate: 1.3, payment_amount: 1000, payment_frequency: "daily", status: "renewal_eligible", status_label: "Renewal Eligible",
  is_history: false, outcome_required: false, renewal_eligible_on: null, manual_renewal_eligible: false, residual_amount: null, buyout_option: null, buyout_price: null,
  end_of_term_date: null, commission_model: "profit_share", commission_terms: {}, internal_notes: null, previous_contract_id: null, renewal_opportunity_id: null,
  pending_statements: 1, open_opportunity_id: null, open_opportunity_status: null, open_opportunity_application_id: null, closed_at: null, renewal_rule: null,
  balance: { balance: 72000, percent_paid: 52, basis: "estimated", source: "estimated", as_of: "2026-11-01", total_repayable: 150000 },
  rule: { rule_type: "percent_paid", description: "Eligible after 50% repaid", source: "default", percent_threshold: 50 },
  renewal: { eligibility: "eligible", eligible_on: null, days_to_maturity: null, maturity_milestone: null }, next_action: "Start renewal opportunity",
};
const history = { ...contract, id: "22222222-2222-4222-8222-222222222222", status: "paid_out", status_label: "Paid Out", is_history: true, lender_name: "RBC" };
const summary = {
  total_original_financing: 300000, open_original_financing: 150000, estimated_outstanding: 72000, outstanding_has_estimates: true, active_facilities: 1,
  renewal_eligible: 1, renewals_next_90_days: 0, revenue_current_month: 1190, revenue_ytd: 9660, revenue_lifetime: 21430, expected_future_revenue: 1250,
  follow_up: { due_now: 1, next_30: 0, next_60: 0, next_90: 0, approaching_50: 0, no_contact_90_days: 0, last_contact_at: null },
  by_product: [{ product: "MCA", amount: 150000, percent: 100 }], milestones: [],
};
const detail = {
  contract, ledger: [], revenue: { current_month: 0, ytd: 0, lifetime: 0, lifetime_gross: 0, expected_future: 0, next_expected: null, variances: [], schedule: [] },
  opportunities: [], activity: [{ id: "a1", created_at: "2026-10-10", title: "Renewal became eligible", detail: "52% paid", channel: null }], assets: [], insurance: [],
  documents: { contract_documents: [], application_documents: [] }, reviews: [], chain: [], balances: [],
};

beforeEach(() => {
  for (const k of ["get", "post", "put", "patch", "delete"]) h.apiFn[k].mockReset();
  sessionStorage.clear();
  h.apiFn.get.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/active-contracts?")) return { contracts: [contract, history], summary };
    if (path === `/api/active-contracts/${contract.id}`) return detail;
    if (path.startsWith("/api/active-contracts/renewal-rules/")) return { rule: null };
    return {};
  });
  h.apiFn.post.mockResolvedValue({ opportunityId: "o1", applicationId: "newapp" });
  h.apiFn.put.mockResolvedValue({});
});

describe("Active Contracts tab", () => {
  it("shows the portfolio summary, the contracts and the history apart", async () => {
    render(<MemoryRouter><ActiveContractsTab companyId="c0" /></MemoryRouter>);
    await screen.findByTestId("ac-kpis");
    expect(h.apiFn.get).toHaveBeenCalledWith("/api/active-contracts?company_id=c0");
    expect(screen.getByText("Total Original Financing")).toBeTruthy();
    expect(screen.getByText("Clearbanc")).toBeTruthy();
    expect(screen.getByText("Estimated (amortization)")).toBeTruthy();
    expect(screen.queryByText("RBC")).toBeNull();
    expect(screen.getByText(/Completed \/ Closed Contracts \(1\)/)).toBeTruthy();
    expect(screen.getByText("Portfolio by Product Type")).toBeTruthy();
  });
  it("opens the detail and Start Renewal creates the new application", async () => {
    render(<MemoryRouter><ActiveContractsTab companyId="c0" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "View" }));
    const start = await screen.findByRole("button", { name: "Start Renewal Opportunity" });
    expect(screen.getByRole("tab", { name: "Payments & Ledger" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Documents (1)" })).toBeTruthy();
    fireEvent.click(start);
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith(`/api/active-contracts/${contract.id}/renewal/start`, { kind: "renewal" }));
    expect(await screen.findByText("Open the renewal application")).toBeTruthy();
  });
});

describe("record tabs", () => {
  it("Active Contracts sits right of Timeline and mounts when opened", () => {
    render(<ContactRecordTabs timeline={<div>timeline body</div>} contracts={<div>contracts body</div>} />);
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Timeline", "Active Contracts"]);
    expect(screen.queryByText("contracts body")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Active Contracts" }));
    expect(screen.getByText("contracts body")).toBeTruthy();
  });
});

describe("renewal rules on the lender product", () => {
  it("saves the product's own threshold", async () => {
    render(<RenewalRulesEditor productId="p1" category="MCA" />);
    await waitFor(() => expect(h.apiFn.get).toHaveBeenCalledWith("/api/active-contracts/renewal-rules/p1"));
    fireEvent.change(screen.getByLabelText("Renewal trigger"), { target: { value: "percent_paid" } });
    fireEvent.change(screen.getByLabelText("Eligible after % repaid"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save renewal rule" }));
    await waitFor(() => expect(h.apiFn.put).toHaveBeenCalledWith("/api/active-contracts/renewal-rules/p1", expect.objectContaining({ rule_type: "percent_paid", percent_threshold: "50" })));
  });
});

describe("reports", () => {
  it("the portfolio report is Admin only (money group)", () => {
    expect(withPortalReports([], "Admin").map((r) => r.key)).toContain(ACTIVE_CONTRACTS_KEY);
    expect(withPortalReports([], "Staff").map((r) => r.key)).not.toContain(ACTIVE_CONTRACTS_KEY);
  });
});
