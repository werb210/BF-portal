// BF_PORTAL_v872_DEAL_TOOLS - batch 5 screens: the Quotes tab (with sales tax on ticked fees), the ID verification tab
// and settings, the Forecast card (Reports / Dashboard) and a file's forecast panel, payment links on a file or contact
// and Settings > Payments (Boreal's own Stripe account). Open to staff: no plan gates.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), role: "Staff" }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put } }));
vi.mock("@/utils/api", () => ({ apiBlob: vi.fn(async () => new Blob(["%PDF-"])) }));
vi.mock("@/dealTools/ui", async (orig) => ({ ...(await orig<any>()), useIsAdmin: () => h.role === "Admin", useRole: () => h.role }));

import IdVerificationTab from "@/kyc/IdVerificationTab";
import IdVerificationSettings from "@/kyc/IdVerificationSettings";
import { STATUS_LOOK } from "@/kyc/kycApi";
import ForecastCard from "@/forecast/ForecastCard";
import type { Forecast } from "@/forecast/forecastApi";
import PaymentLinksPanel from "@/payments/PaymentLinksPanel";
import PaymentsSettings from "@/payments/PaymentsSettings";
import { STATUS } from "@/payments/paymentsApi";
import { renderReport } from "@/pages/reports/ReportDataCards";
import { contrast } from "@/fraud/status";

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.put.mockReset(); h.role = "Staff";
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

// ------------------------------------------------------------------------------------------------ ID verification
const verification = (over: Record<string, unknown> = {}) => ({
  id: "v1", application_id: "app-1", contact_id: "c1", person_name: "Jane Doe", person_role: "applicant", provider: "onfido",
  status: "review", decision_source: "vendor", reasons: [{ code: "identity_record_caution", severity: "amber", text: "The identity record (data source) check needs a look (result: caution)." }],
  checks: { document: "clear", identity_record: "caution" }, document_ids: ["d1", "d2"], has_id_details: true, requested_via: "staff",
  requested_at: "2026-11-01T10:00:00Z", started_at: null, completed_at: "2026-11-01T10:05:00Z", reviewed_at: null, review_note: null, ...over,
});

describe("ID verification tab", () => {
  it("sends a request to a guarantor, shows results, and lets staff approve a review", async () => {
    h.get.mockImplementation(async (url: string) => {
      if (url.endsWith("/id-details")) return { ok: true, details: { first_name: "Jane", last_name: "Doe", document_number: "*****6789" } };
      return { ok: true, application_id: "app-1", provider: { key: "onfido", label: "Entrust IDV (Onfido)", configured: true, hosted: true },
        people: [{ contact_id: "c1", role: "applicant", name: "Jane Doe", has_phone: true }, { contact_id: "c2", role: "guarantor", name: "Gus G", has_phone: true }],
        verifications: [verification()] };
    });
    h.post.mockResolvedValue({ ok: true, created: true, verification: verification({ id: "v2", status: "requested" }) });
    render(<IdVerificationTab applicationId="app-1" />);
    await screen.findByTestId("kyc-row-v1");
    expect(screen.getByTestId("kyc-chip-review")).toHaveTextContent("Needs review");
    expect(screen.getByText(/identity record \(data source\) check needs a look/)).toBeInTheDocument();
    expect(screen.getByText(/2 picture\(s\) saved to the Documents tab/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Person to verify"), { target: { value: "c2" } });
    fireEvent.click(screen.getByRole("button", { name: "Send verification request" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/kyc/applications/app-1/requests", { contact_id: "c2" }));
    fireEvent.click(screen.getByRole("button", { name: "Show what the ID says" }));
    expect(await screen.findByText("*****6789")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /full number/ })).toBeNull(); // staff cannot reveal
    fireEvent.change(screen.getByLabelText("Review note"), { target: { value: "Looks right" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/kyc/verifications/v1/decision", { decision: "approved", note: "Looks right" }));
  });

  it("an Admin can reveal the full ID number", async () => {
    h.role = "Admin";
    h.get.mockImplementation(async (url: string) => {
      if (url.includes("/id-details")) return { ok: true, details: { document_number: url.endsWith("full=1") ? "D1234-56789" : "*****6789" } };
      return { ok: true, application_id: "app-1", provider: { key: "manual", label: "Manual review", configured: true, hosted: false }, people: [], verifications: [verification()] };
    });
    render(<IdVerificationTab applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Show what the ID says" }));
    fireEvent.click(await screen.findByRole("button", { name: /full number/ }));
    expect(await screen.findByText("D1234-56789")).toBeInTheDocument();
  });

  it("status chips are readable (contrast 4.5:1 or better)", () => {
    for (const s of Object.values(STATUS_LOOK)) expect(contrast(s.fg, s.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("Settings > ID verification shows the webhook address and saves the wizard step", async () => {
    h.get.mockResolvedValue({ ok: true, settings: { provider: null, wizard_step: false, wizard_people: "applicant", updated_at: null }, active_provider: "manual",
      providers: [{ key: "onfido", label: "Entrust IDV (Onfido)", configured: false, hosted: true, settings: ["ONFIDO_API_TOKEN"] }, { key: "manual", label: "Manual review", configured: true, hosted: false, settings: [] }],
      webhook_url: "https://server.boreal.financial/api/kyc/webhooks/onfido" });
    h.put.mockResolvedValue({ ok: true, settings: { provider: null, wizard_step: true, wizard_people: "applicant", updated_at: null } });
    render(<IdVerificationSettings />);
    expect(await screen.findByTestId("kyc-webhook-url")).toHaveTextContent("https://server.boreal.financial/api/kyc/webhooks/onfido");
    fireEvent.click(screen.getByRole("checkbox", { name: /Ask for ID right after/ }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/kyc/settings", { wizard_step: true }));
    expect(await screen.findByLabelText("Who to verify")).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------------------------------------ forecast
const b = (o: Partial<Record<string, number | null>> = {}) => ({ closed: 0, commit: 0, best_case: 0, pipeline: 0, weighted: 0, closed_amount: 0, files: 0, goal_commission: null, goal_funding: null, ...o }) as any;
const data: Forecast = {
  granularity: "month", from: "2026-11", currency: "CAD", own: false, team_id: null, probabilities: { Offer: 75 },
  periods: [{ key: "2026-11", label: "Nov 2026", start: "2026-11-01", end: "2026-12-01" }],
  reps: [{ user_id: "u1", name: "Rita", periods: [b({ closed: 1000, commit: 3000, best_case: 3000, pipeline: 3000, weighted: 2500, goal_commission: 3000 })] }],
  teams: [{ team_id: "t1", name: "West", periods: [b({ closed: 1000, commit: 3000 })] }],
  total: [b({ closed: 1000, commit: 3000, best_case: 3000, pipeline: 3000, weighted: 2500, goal_commission: 3000 })],
  unscheduled: { files: 2, pipeline: 5000, weighted: 800 }, overdue_files: 1,
  deals: [{ id: "a1", name: "Acme", owner: "u1", owner_name: "Rita", stage: "Offer", probability: 75, category: "commit", expected_close_date: "2026-11-20", commission: 2000, weighted: 1500, period: "2026-11", overdue: false }],
};

describe("Forecast card", () => {
  it("renders the roll-up from the report data (Reports and the Dashboard), with goal attainment and unscheduled files", () => {
    render(<>{renderReport("forecast", data)}</>);
    expect(screen.getByTestId("forecast-card")).toBeInTheDocument();
    expect(screen.getByText("Everyone")).toBeInTheDocument();
    expect(screen.getByText("Team: West")).toBeInTheDocument();
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
    expect(screen.getByText(/have no expected close date/)).toBeInTheDocument();
  });

  it("switches to quarters, edits a file's close date, and Admins save the stage chances (the pipeline probabilities)", async () => {
    h.role = "Admin";
    h.get.mockImplementation(async (url: string) => (url.startsWith("/api/forecast/stages") ? { ok: true, stages: [{ stage: "Offer", probability: 75 }] } : { ok: true, ...data, granularity: "quarter" }));
    h.put.mockResolvedValue({ ok: true });
    render(<ForecastCard initial={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Quarterly" }));
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/forecast?granularity=quarter"));
    fireEvent.click(screen.getByRole("button", { name: /Show the files/ }));
    fireEvent.change(screen.getByLabelText("Expected close for Acme"), { target: { value: "2026-12-05" } });
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/forecast/applications/a1", { expected_close_date: "2026-12-05" }));
    fireEvent.click(screen.getByRole("button", { name: "Stage chances" }));
    expect(await screen.findByText(/same probabilities as Settings > Pipelines/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Offer chance"), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: "Save chances" }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/forecast/stages", { stages: { Offer: 65 } }));
  });

  it("staff see their own files and no stage chances button", () => {
    render(<ForecastCard initial={{ ...data, own: true }} />);
    expect(screen.queryByRole("button", { name: "Stage chances" })).toBeNull();
    expect(screen.queryByText("Everyone")).toBeNull();
  });

});

// ------------------------------------------------------------------------------------------------ payment links
const link = (over: Record<string, unknown> = {}) => ({
  id: "l1", url: "https://server.boreal.financial/api/payments/pay/tok", application_id: "app-1", contact_id: "c1", description: "Broker fee", amount: 2500,
  currency: "cad", methods: ["card", "acss_debit"], status: "open", payment_method_type: null, amount_received: null, paid_at: null, processing_at: null,
  failure_message: null, sent_channels: ["email"], sent_at: "2026-10-26T15:00:00Z", expires_at: "2026-11-25T15:00:00Z", created_at: "2026-10-26T15:00:00Z",
  quickbooks_status: "none", quickbooks_error: null, ...over,
});

describe("Payments on a file or contact", () => {
  it("lists paid, processing and failed links in plain words with the QuickBooks state", async () => {
    h.get.mockResolvedValue({ configured: true, problem: null, links: [
      link(),
      link({ id: "l2", status: "paid", paid_at: "2026-10-27T10:00:00Z", payment_method_type: "acss_debit", quickbooks_status: "recorded" }),
      link({ id: "l3", status: "processing", processing_at: "2026-10-28T10:00:00Z", payment_method_type: "acss_debit" }),
      link({ id: "l4", status: "failed", failure_message: "The bank debit failed." }),
    ] });
    render(<PaymentLinksPanel applicationId="app-1" />);
    const paid = await screen.findByTestId("payment-l2");
    expect(within(paid).getByText("Paid")).toBeInTheDocument();
    expect(within(paid).getByText(/by bank debit/)).toBeInTheDocument();
    expect(within(paid).getByText("Recorded in QuickBooks against the fee invoice")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-l1")).getByText("Waiting for payment")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-l3")).getByText(/clears in about 3 to 5 business days/)).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-l4")).getByText(/can try again with the same link/)).toBeInTheDocument();
    expect(h.get).toHaveBeenCalledWith("/api/payments/links", { params: { application_id: "app-1" } });
  });

  it("fills the fee agreement amount and sends the link", async () => {
    h.get.mockImplementation(async (url: string) => url.includes("fee-suggestion")
      ? { fee: { amount: 2000, description: "Broker fee (2% of funding)" } }
      : { configured: true, problem: null, links: [] });
    h.post.mockResolvedValue({ link: link(), sent: ["email"], refused: { sms: "The contact has not agreed to texts." } });
    render(<PaymentLinksPanel applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Request a fee payment" }));
    // BF_PORTAL_v906_PAYMENT_BASIS - the request starts from the signed fee agreement (or an invoice).
    fireEvent.click(await screen.findByLabelText(/The fee in the signed fee agreement/));
    await waitFor(() => expect(screen.getByLabelText("Amount (CAD)")).toHaveValue("2000"));
    expect(screen.getByLabelText("What it is for (shown to the client)")).toHaveValue("Broker fee (2% of funding)");
    fireEvent.click(screen.getByLabelText(/Send by text/));
    fireEvent.click(screen.getByRole("button", { name: "Create and send" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/payments/links", {
      application_id: "app-1", amount: "2000", description: "Broker fee (2% of funding)", methods: ["card", "acss_debit"], send: { email: true, sms: true },
    }));
    expect(await screen.findByText("Payment link sent by email.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("not agreed to texts");
  });

  it("says what is missing when Stripe is not set up on the server", async () => {
    h.get.mockResolvedValue({ configured: false, problem: "Online payments are not set up on this server yet (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).", links: [] });
    render(<PaymentLinksPanel contactId="c1" />);
    expect(await screen.findByText(/not set up on this server yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request a fee payment" })).toBeNull();
  });

  // BF_PORTAL_v906_PAYMENT_BASIS
  it("without a signed fee agreement it is an invoice, and nothing is sent until the amount and purpose are in", async () => {
    h.get.mockImplementation(async (url: string) => url.includes("fee-suggestion") ? { fee: null } : { configured: true, problem: null, links: [] });
    h.post.mockResolvedValue({ link: link(), sent: [], refused: {} });
    render(<PaymentLinksPanel applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Request a fee payment" }));
    expect(await screen.findByLabelText(/The signed fee agreement \(none signed/)).toBeDisabled();
    expect(screen.getByLabelText(/An invoice/)).toBeChecked();
    const send = screen.getByRole("button", { name: "Create and send" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Amount (CAD)"), { target: { value: "750" } });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("What it is for (shown to the client)"), { target: { value: "Broker fee - invoice 1042" } });
    expect(send).not.toBeDisabled();
    fireEvent.click(send);
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/payments/links", expect.objectContaining({ amount: "750", description: "Broker fee - invoice 1042" })));
  });

  it("every status pill is readable (4.5:1 or better)", () => {
    for (const s of Object.values(STATUS)) expect(contrast(s.fg, s.bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Settings > Payments and the Fee payments report", () => {
  it("shows Boreal's Stripe account, what it can take, the webhook address and the report", async () => {
    h.get.mockImplementation(async (url: string) => url.includes("/report")
      ? { days: 90, sent: 2, paid: { count: 1, amount: 2500, card: 1, bank_debit: 0 }, processing: { count: 0, amount: 0 }, outstanding: { count: 1, amount: 500 }, failed: 0, by_month: [] }
      : { problem: null, configured: true, livemode: false, account: { id: "acct_1", business_name: "Boreal Financial", country: "CA", default_currency: "cad", charges_enabled: true, acss_debit_enabled: false, livemode: false },
          webhook_url: "https://server.boreal.financial/api/payments/stripe/webhook", webhook_events: ["checkout.session.completed"] });
    render(<PaymentsSettings />);
    expect(await screen.findByTestId("stripe-account")).toHaveTextContent("Boreal Financial (acct_1) - test mode");
    expect(screen.getByText(/turn on "Canadian pre-authorized debits" in Stripe/)).toBeInTheDocument();
    expect(screen.getByTestId("stripe-webhook-url")).toHaveTextContent("https://server.boreal.financial/api/payments/stripe/webhook");
    expect(await screen.findByTestId("report-paid")).toHaveTextContent("$2,500.00");
  });

  it("names the missing server settings", async () => {
    h.get.mockResolvedValue({ problem: "Online payments are not set up on this server yet (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).", configured: false, livemode: null, account: null, webhook_url: "https://server.boreal.financial/api/payments/stripe/webhook", webhook_events: [] });
    render(<PaymentsSettings />);
    expect(await screen.findByTestId("stripe-problem")).toHaveTextContent("STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET");
  });

  it("the Fee payments report card draws the report data", () => {
    render(<>{renderReport("fee_payments", { days: 90, sent: 3, paid: { count: 2, amount: 4100, card: 1, bank_debit: 1 }, processing: { count: 1, amount: 500 }, outstanding: { count: 0, amount: 0 }, failed: 0, by_month: [{ month: "2026-11", amount: 4100 }] })}</>);
    expect(screen.getByTestId("report-paid")).toHaveTextContent("$4,100.00 (2: 1 by card, 1 by bank debit)");
  });
});
