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
vi.mock("../ConditionsChecklist", () => ({ default: () => <div data-testid="body-Conditions" /> }));
vi.mock("../IssueTermSheet", () => ({ default: (p: { onCancel?: () => void }) => <div data-testid="body-Issue" data-cancel={String(!!p.onCancel)} /> }));
vi.mock("@/features/quickbooks/QuickBooksInvoiceBadge", () => ({ default: () => null }));
vi.mock("@/features/loanCalculator/CalculatorButton", () => ({ default: () => <button type="button">Calculator</button>, amountFrom: (...v: unknown[]) => { for (const x of v) { const n = Number(x); if (Number.isFinite(n) && n > 0) return n; } return null; } }));

import ApplicationDetail, { activeSubFromPath, mainFor } from "../ApplicationDetail";
import { nextStepFor, offerStateOf } from "../nextStep";
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
  it("has the main tabs in order (Offer its own tab, v943), and no Quotes, Deal desk or Funding tab", async () => {
    answer();
    open("/applications/app-1/application");
    const tabs = within(await screen.findByTestId("card-tabs")).getAllByRole("button").map((b) => b.textContent);
    expect(tabs).toEqual(["Overview", "Documents", "Request Items", "Notes", "Lenders", "Offer"]);
    const subs = within(screen.getByTestId("card-subtabs")).getAllByRole("button").map((b) => b.textContent);
    expect(subs).toEqual(["Application", "Financials", "Banking analysis"]);
    expect(screen.queryByText("Quotes")).toBeNull();
    expect(screen.queryByText("Deal desk")).toBeNull();
    expect(screen.queryByText(/Expected close/)).toBeNull();
  });

  it("Documents holds Documents, Credit summary and Fraud check; ID results show inside Fraud check once ID is requested or uploaded (v941)", async () => {
    answer();
    const first = open("/applications/app-1/fraud");
    await waitFor(() => expect(within(screen.getByTestId("card-subtabs")).getAllByRole("button").map((b) => b.textContent)).toEqual(["Documents", "Credit summary", "Fraud check"]));
    expect(screen.queryByTestId("body-IdVerificationTab")).toBeNull();
    first.unmount();
    answer({ portal: { documents: [{ category: "2 pieces of Government Issued ID" }] } });
    open("/applications/app-1/id-verification");
    expect(await screen.findByTestId("body-IdVerificationTab")).toBeInTheDocument();
    expect(screen.getByTestId("body-FraudTab")).toBeInTheDocument();
    expect(within(screen.getByTestId("card-subtabs")).queryByRole("button", { name: "ID verification" })).toBeNull();
  });

  it("the card hides the Lenders tab's own Hold / Reject / Fraud buttons", async () => {
    answer();
    open("/applications/app-1/lenders");
    expect((await screen.findByTestId("body-LendersTab")).getAttribute("data-hide")).toBe("true");
  });

  it("Close appears once a term sheet is signed (v942)", async () => {
    answer({ offers: { items: [{ id: "o1", status: "accepted" }] } });
    open("/applications/app-1/application");
    await waitFor(() => expect(within(screen.getByTestId("card-tabs")).getAllByRole("button").map((b) => b.textContent)).toContain("Close"));
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
    // v946: at the Offer stage the button follows the term sheets on the file.
    expect(nextStepFor({ stage: "Offer", signing: "signed", offers: 0, offerState: "none" })?.label).toBe("Add the term sheet");
    expect(nextStepFor({ stage: "Offer", signing: "signed", offers: 1, offerState: "sent" })).toEqual({ label: "Waiting for the client to sign", tab: "offer", waiting: true });
    expect(nextStepFor({ stage: "Offer", signing: "signed", offers: 1, offerState: "signed" })?.label).toBe("Clear funding conditions");
    expect(offerStateOf([])).toBe("none");
    expect(offerStateOf([{ status: "pending" }, { status: "pending_acceptance" }])).toBe("draft");
    expect(offerStateOf([{ status: "pending_acceptance" }])).toBe("sent");
    expect(offerStateOf([{ status: "pending_acceptance" }, { status: "accepted" }])).toBe("signed");
    expect(nextStepFor({ stage: "Accepted", signing: "signed", offers: 1 })?.label).toBe("Clear funding conditions");
    expect(nextStepFor({ stage: "Funded", signing: "signed", offers: 1 })).toBeNull();
  });
});

// BF_PORTAL_v946_OFFER_STEPS
describe("Offer tab: three steps", () => {
  const OFFER = { id: "o1", lender_name: "Northern Capital", amount: "250000", rate_factor: "11.9%", term: "36 months", payment_frequency: "Monthly", expiry_date: "2026-12-04", document_url: "https://files.test/ts.pdf", status: "pending", term_sheet_mode: "lender", has_lender_term_sheet: true, revenue: { spread: null, broker_fee: 0, setup_fee: 495, proceeds_fee: 0, lender_commission: 2500, total: 2995, funds_to_client: null, client_payment: null, client_total_repaid: null, term_months: 36, note: null } };

  it("with no term sheet, only step 1 is open and it shows the form", async () => {
    answer();
    render(<OfferTab applicationId="app-1" />);
    expect(await screen.findByTestId("body-Issue")).toHaveAttribute("data-cancel", "false");
    expect(screen.getByTestId("offer-step-1")).toHaveAttribute("data-state", "open");
    expect(screen.getByTestId("offer-step-2")).toHaveAttribute("data-state", "wait");
    expect(screen.getByTestId("offer-step-3")).toHaveAttribute("data-state", "wait");
    expect(screen.queryByTestId("body-Conditions")).toBeNull();
    expect(screen.queryByText(/Read the lender's offer document/)).toBeNull(); // one place to upload, not two
  });

  it("a saved term sheet is one summary line; step 2 sends it; step 3 is the checklist", async () => {
    answer({ offers: { items: [OFFER] } });
    h.api.post.mockResolvedValue({ ok: true });
    render(<OfferTab applicationId="app-1" />);
    const row = await screen.findByTestId("offer-row-o1");
    expect(row).toHaveTextContent("Northern Capital · $250,000 · 11.9% · 36 months · Monthly");
    expect(row).toHaveTextContent("The lender's term sheet · expires 2026-12-04 · we earn $2,995");
    expect(screen.queryByTestId("body-Issue")).toBeNull();
    expect(screen.getByTestId("offer-step-1")).toHaveAttribute("data-state", "done");
    expect(screen.getByTestId("offer-state-o1")).toHaveTextContent("Not sent yet");
    expect(screen.getByTestId("body-Conditions")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("offer-send-o1"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/offers/o1/send-for-signature", {}));
    expect(await screen.findByText(/The client has a text/)).toBeInTheDocument();
  });

  it("once sent it says so and offers Send again; once signed there is nothing to send", async () => {
    answer({ offers: { items: [{ ...OFFER, status: "pending_acceptance" }, { ...OFFER, id: "o2", lender_name: "Second Lender", status: "accepted" }] } });
    render(<OfferTab applicationId="app-1" />);
    expect(await screen.findByTestId("offer-state-o1")).toHaveTextContent("Waiting for the client to sign");
    expect(screen.getByTestId("offer-send-o1")).toHaveTextContent("Send again");
    expect(screen.getByTestId("offer-step-2")).toHaveAttribute("data-state", "done");
    expect(screen.getByTestId("offer-state-o2")).toHaveTextContent("Signed by the client");
    expect(screen.queryByTestId("offer-send-o2")).toBeNull();
    expect(screen.getByText(/Record the funding on the Close tab/)).toBeInTheDocument();
  });

  it("Change edits our rate and fees, switches to our template, and fills the template", async () => {
    answer({ offers: { items: [OFFER] } });
    h.api.patch.mockResolvedValue({ offer: { revenue: { ...OFFER.revenue, spread: 6408, total: 9403 } } });
    h.api.post.mockResolvedValue({ ok: true });
    render(<OfferTab applicationId="app-1" />);
    fireEvent.click(await screen.findByTestId("offer-change-o1"));
    expect(screen.queryByLabelText("Our rate to the client")).toBeNull(); // the lender's sheet: its own rate
    fireEvent.click(screen.getByTestId("change-template-o1"));
    fireEvent.change(screen.getByLabelText("Our rate to the client"), { target: { value: "13.4" } });
    fireEvent.change(screen.getByLabelText("Set-up fee"), { target: { value: "495" } });
    fireEvent.click(screen.getByTestId("change-save-o1"));
    await waitFor(() => expect(h.api.patch).toHaveBeenCalledWith("/api/offers/o1/pricing", expect.objectContaining({ term_sheet_mode: "template", client_rate: "13.4", setup_fee: "495" })));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/licensee-documents/offers/o1/term-sheet", {}));
    expect(await screen.findByTestId("revenue-o1")).toHaveTextContent("$9,403");
  });

  it("another term sheet can be added, with a way back", async () => {
    answer({ offers: { items: [OFFER] } });
    render(<OfferTab applicationId="app-1" />);
    fireEvent.click(await screen.findByTestId("offer-add-another"));
    expect(screen.getByTestId("body-Issue")).toHaveAttribute("data-cancel", "true");
  });

  it("the header button follows the offer: waiting once it is sent", async () => {
    answer({ offers: { items: [{ ...OFFER, status: "pending_acceptance" }] } });
    open("/applications/app-1/offer");
    await waitFor(() => expect(screen.getByTestId("next-step")).toHaveTextContent(/^Waiting for the client to sign$/));
  });
});
