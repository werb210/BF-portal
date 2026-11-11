// BF_PORTAL_v938_CARD_REDESIGN - the application card reorganised with Todd and Andrew (Nov 11 2026).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => {
  const fn = vi.fn();
  return { api: Object.assign(fn, { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }) };
});
vi.mock("@/api", () => ({ api: h.api, rawApiFetch: vi.fn(), default: h.api }));
// The tab bodies load their own data; these tests are about the card around them.
vi.mock("@/pages/applications/tabs/ApplicationTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-ApplicationTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/pages/applications/tabs/BankingAnalysisTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-BankingAnalysisTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/pages/applications/tabs/FinancialsTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-FinancialsTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/pages/applications/tabs/DocumentsTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-DocumentsTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/pages/applications/tabs/CreditSummaryTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-CreditSummaryTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/pages/applications/tabs/RequestItemsTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-RequestItemsTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/pages/applications/tabs/LendersTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-LendersTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/pages/applications/tabs/SbaSigningTab", () => ({ default: (p: Record<string, unknown>) => <div data-testid="body-SbaSigningTab" data-hide={String(p.hideParkButtons ?? "")} /> }));
vi.mock("@/fraud/FraudTab", () => ({ default: () => <div data-testid="body-FraudTab" /> }));
vi.mock("@/kyc/IdVerificationTab", () => ({ default: () => <div data-testid="body-IdVerificationTab" /> }));
vi.mock("@/pages/applications/_shared/NotesEditor", () => ({ default: () => <div data-testid="body-NotesEditor" /> }));
vi.mock("@/pages/applications/tabs/LenderQaSection", () => ({ default: () => <div data-testid="body-LenderQa" /> }));
vi.mock("@/brokerTools/FundingConditionsPanel", () => ({ default: () => <div data-testid="body-Funding" /> }));
vi.mock("@/features/quickbooks/QuickBooksInvoiceBadge", () => ({ default: () => null }));
vi.mock("@/features/loanCalculator/CalculatorButton", () => ({ default: () => <button type="button">Calculator</button>, amountFrom: (...v: unknown[]) => { for (const x of v) { const n = Number(x); if (Number.isFinite(n) && n > 0) return n; } return null; } }));

import ApplicationDetail, { activeSubFromPath, mainFor } from "../ApplicationDetail";
import { nextStepFor } from "../nextStep";
import OfferTab from "../OfferTab";

const DETAILS = { stage: "Offer", signing: { status: "signed" }, overview: { name: "Maple Ridge Ltd.", requestedAmount: 250000, productCategory: "TERM_LOAN" }, businessDetails: { legalName: "Maple Ridge Landscaping Ltd." }, offerCount: 2, assignedTo: { id: "u1", name: "Andrew P" } };

function answer(over: Record<string, unknown> = {}) {
  h.api.get.mockImplementation(async (url: string) => {
    if (url.includes("/details")) return over.details ?? DETAILS;
    if (url.includes("/sba-signing")) return { isSba: false };
    if (url.includes("/api/kyc/applications/")) return over.kyc ?? { verifications: [] };
    if (url.includes("/api/portal/applications/")) return over.portal ?? { documents: [] };
    if (url.includes("/api/application-origin/")) return over.origin ?? { origin: null };
    if (url.includes("/api/offers?applicationId=")) return over.offers ?? { items: [] };
    return {};
  });
}

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/applications/:id/*" element={<ApplicationDetail />} /><Route path="/pipeline" element={<div>pipeline</div>} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { h.api.get.mockReset(); h.api.post.mockReset(); h.api.patch.mockReset(); });

describe("tabs and sub-tabs", () => {
  it("has the five main tabs in order, and no Quotes, Deal desk or Funding tab", async () => {
    answer();
    open("/applications/app-1/application");
    const tabs = within(await screen.findByTestId("card-tabs")).getAllByRole("button").map((b) => b.textContent);
    expect(tabs).toEqual(["Overview", "Documents", "Request Items", "Notes", "Lenders"]);
    const subs = within(screen.getByTestId("card-subtabs")).getAllByRole("button").map((b) => b.textContent);
    expect(subs).toEqual(["Application", "Financials", "Banking analysis"]);
    expect(screen.queryByText("Quotes")).toBeNull();
    expect(screen.queryByText("Deal desk")).toBeNull();
    expect(screen.queryByText(/Expected close/)).toBeNull();
  });

  it("Documents holds Documents, Credit summary and Fraud check; ID verification only once ID is requested or uploaded", async () => {
    answer();
    const first = open("/applications/app-1/documents");
    await waitFor(() => expect(within(screen.getByTestId("card-subtabs")).getAllByRole("button").map((b) => b.textContent)).toEqual(["Documents", "Credit summary", "Fraud check"]));
    first.unmount();
    answer({ portal: { documents: [{ category: "2 pieces of Government Issued ID" }] } });
    open("/applications/app-1/documents");
    expect(await screen.findByRole("button", { name: "ID verification" })).toBeInTheDocument();
  });

  it("Lenders holds Lenders and Offer, and the card hides the Lenders tab's own Hold / Reject / Fraud buttons", async () => {
    answer();
    open("/applications/app-1/lenders");
    expect(within(await screen.findByTestId("card-subtabs")).getAllByRole("button").map((b) => b.textContent)).toEqual(["Lenders", "Offer"]);
    expect(screen.getByTestId("body-LendersTab").getAttribute("data-hide")).toBe("true");
  });

  it("Notes shows the notes and the questions for the lender side by side", async () => {
    answer();
    open("/applications/app-1/notes");
    const pair = await screen.findByTestId("notes-and-lender-questions");
    expect(within(pair).getByTestId("body-NotesEditor")).toBeInTheDocument();
    expect(within(pair).getByTestId("body-LenderQa")).toBeInTheDocument();
  });

  it("old links land on the nearest new place", () => {
    expect(activeSubFromPath("/applications/a/quotes")).toBe("offer");
    expect(activeSubFromPath("/applications/a/funding")).toBe("offer");
    expect(activeSubFromPath("/applications/a/deal-desk")).toBe("application");
    expect(mainFor("credit-summary").label).toBe("Documents");
  });
});

describe("header", () => {
  it("shows the business name and key numbers, with no stage chip", async () => {
    answer();
    open("/applications/app-1/application");
    expect(await screen.findByTestId("card-title")).toHaveTextContent("Maple Ridge Landscaping Ltd.");
    expect(screen.getByTestId("kpi-requested")).toHaveTextContent("$250,000");
    expect(screen.getByTestId("kpi-product")).toHaveTextContent("Term Loan");
    expect(screen.getByTestId("kpi-offers")).toHaveTextContent("2");
    expect(screen.getByTestId("kpi-broker")).toHaveTextContent("Andrew P");
    expect(screen.queryByTestId("card-parked")).toBeNull();
  });

  it("Next step opens the tab where it is done", async () => {
    answer();
    open("/applications/app-1/application");
    fireEvent.click(await screen.findByTestId("next-step"));
    expect(await screen.findByTestId("offer-tab")).toBeInTheDocument();
  });

  it("the ⋯ menu puts a file on Hold only with a reason", async () => {
    answer();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("  ");
    open("/applications/app-1/application");
    fireEvent.click(await screen.findByTestId("card-menu"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Hold/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("A reason is required");
    expect(h.api.patch).not.toHaveBeenCalled();
    prompt.mockRestore();
  });

  it("Referred by is a chip that opens the details", async () => {
    answer({ origin: { origin: { kind: "referrer", partner: "Sam Lee", company: null, email: "sam@example.com", phone: null, sentAt: "2026-07-20T00:00:00Z" } } });
    open("/applications/app-1/application");
    const chip = await screen.findByTestId("origin-chip");
    expect(chip).toHaveTextContent("Referred by Sam Lee");
    expect(screen.queryByTestId("application-origin")).toBeNull();
    fireEvent.click(chip);
    expect(await screen.findByTestId("application-origin")).toHaveTextContent("Referred by Sam Lee");
  });
});

describe("next step", () => {
  it("follows the file", () => {
    expect(nextStepFor({ stage: "In Review", signing: "not_started", offers: 0 })).toEqual({ label: "Send application for signing", tab: "application" });
    expect(nextStepFor({ stage: "In Review", signing: "signed", offers: 0 })).toEqual({ label: "Send to lenders", tab: "lenders" });
    expect(nextStepFor({ stage: "Documents Required", signing: null, offers: 0 })?.tab).toBe("request-items");
    expect(nextStepFor({ stage: "Off to Lender", signing: "signed", offers: 0 })?.label).toBe("Upload the lender's term sheet");
    expect(nextStepFor({ stage: "Offer", signing: "signed", offers: 1 })).toEqual({ label: "Send term sheet for signature", tab: "offer" });
    expect(nextStepFor({ stage: "Accepted", signing: "signed", offers: 1 })?.label).toBe("Clear funding conditions");
    expect(nextStepFor({ stage: "Funded", signing: "signed", offers: 1 })).toBeNull();
  });
});

describe("Offer sub-tab", () => {
  it("lists every term sheet and sends one to the client to sign", async () => {
    answer({ offers: { items: [
      { id: "o1", lender_name: "Northern Capital", amount: "250000", rate_factor: "8.5%", term: "36 months", payment_frequency: "Monthly", expiry_date: "2026-12-01", document_url: "https://x/ts.pdf", status: "pending" },
      { id: "o2", lender_name: "Prairie Lending", amount: "240000", rate_factor: "1.28", term: "12 months", payment_frequency: "Weekly", expiry_date: null, document_url: null, status: "accepted" },
    ] } });
    h.api.post.mockResolvedValue({ ok: true });
    render(<OfferTab applicationId="app-1" />);
    expect(await screen.findByTestId("offer-row-o1")).toHaveTextContent("Northern Capital");
    expect(screen.getByTestId("offer-row-o2")).toHaveTextContent("Signed by the client");
    expect((screen.getByTestId("offer-send-o2") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("offer-send-o1"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/offers/o1/send-for-signature", {}));
    expect(await screen.findByText(/can review and sign it in their app/)).toBeInTheDocument();
    expect(screen.getByTestId("body-Funding")).toBeInTheDocument();
  });

  it("says when there is no term sheet yet", async () => {
    answer();
    render(<OfferTab applicationId="app-1" />);
    expect(await screen.findByTestId("offer-none")).toHaveTextContent("No term sheet yet.");
  });
});

describe("Offer pricing (OFFER_PRICING_v1)", () => {
  it("prices an offer we buy: our rate, a set-up fee, then makes our term sheet", async () => {
    answer({ offers: { items: [
      { id: "o1", lender_name: "Northern Capital", amount: "100000", rate_factor: "6%", term: "36 months", payment_frequency: "Monthly", expiry_date: null, document_url: null, status: "pending",
        term_sheet_mode: "lender", revenue: { spread: 0, broker_fee: 0, setup_fee: 0, proceeds_fee: 0, lender_commission: 0, total: 0, funds_to_client: 100000, client_payment: 3042, client_total_repaid: 109519, term_months: 36, note: null } },
    ] } });
    h.api.patch.mockResolvedValue({ ok: true, offer: { revenue: { spread: 1658, broker_fee: 0, setup_fee: 500, proceeds_fee: 0, lender_commission: 0, total: 2158, funds_to_client: 100000, client_payment: 3088, client_total_repaid: 111161, term_months: 36, note: null } } });
    h.api.post.mockResolvedValue({ ok: true, message: "Your Boreal term sheet is now this offer's term sheet." });
    render(<OfferTab applicationId="app-1" />);
    fireEvent.click(await screen.findByTestId("offer-pricing-o1"));
    expect(screen.queryByLabelText("Our rate to the client")).toBeNull();
    fireEvent.click(screen.getByTestId("mode-ours-o1"));
    fireEvent.change(screen.getByLabelText("Our rate to the client"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Set-up fee"), { target: { value: "500" } });
    fireEvent.click(screen.getByTestId("pricing-save-o1"));
    await waitFor(() => expect(h.api.patch).toHaveBeenCalledWith("/api/offers/o1/pricing", expect.objectContaining({ term_sheet_mode: "ours", client_rate: "7", setup_fee: "500", broker_fee: null })));
    expect(await screen.findByTestId("revenue-o1")).toHaveTextContent("$2,158");
    fireEvent.click(screen.getByTestId("make-ours-o1"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/licensee-documents/offers/o1/term-sheet", {}));
  });

  it("shows each offer's revenue and marks our term sheet", async () => {
    answer({ offers: { items: [
      { id: "o1", lender_name: "Northern Capital", amount: "100000", rate_factor: "6%", term: "36", payment_frequency: null, expiry_date: null, document_url: null, status: "pending",
        term_sheet_mode: "ours", revenue: { spread: 1658, broker_fee: 0, setup_fee: 500, proceeds_fee: 0, lender_commission: 0, total: 2158, funds_to_client: 100000, client_payment: null, client_total_repaid: null, term_months: 36, note: null } },
    ] } });
    render(<OfferTab applicationId="app-1" />);
    expect(await screen.findByTestId("offer-revenue-o1")).toHaveTextContent("$2,158");
    expect(screen.getByTestId("offer-row-o1")).toHaveTextContent("client doesn't see the lender");
  });
});
