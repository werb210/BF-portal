// BF_PORTAL_v943_ISSUE_TERM_SHEET / BF_PORTAL_v942_CLOSE_TAB
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const fn = vi.fn();
  return { api: Object.assign(fn, { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }), upload: vi.fn(), read: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.api, rawApiFetch: vi.fn(), default: h.api }));
vi.mock("@/api/lenders", () => ({
  fetchLenderEnvelope: async () => ({ matches: [{ id: "lp-1", lenderName: "Northern Capital", productName: "Term" }] }),
  uploadLenderTermSheet: (...a: unknown[]) => h.upload(...a),
}));
vi.mock("@/offers/offerReaderApi", async (orig) => ({ ...(await orig<Record<string, unknown>>()), readOfferFile: (...a: unknown[]) => h.read(...a) }));
vi.mock("@/payments/PaymentLinksPanel", () => ({ default: () => <div data-testid="payments" /> }));
vi.mock("../InvoicePanel", () => ({ default: () => <div data-testid="invoice" /> })); // v952

import { MemoryRouter } from "react-router-dom";
import IssueTermSheet from "../IssueTermSheet";
import ConditionsChecklist from "../ConditionsChecklist";
import CloseTab from "../CloseTab";

beforeEach(() => { for (const k of ["get", "post", "put", "patch"] as const) h.api[k].mockReset(); h.upload.mockReset(); h.read.mockReset(); });

// BF_PORTAL_v946_OFFER_STEPS - step 1: the lender's term sheet, or our template.
describe("step 1: term sheet", () => {
  const withTemplate = (yes: boolean) => h.api.get.mockImplementation(async (url: string) => (url === "/api/licensee-documents" ? { documents: yes ? [{ kind: "term_sheet", active: true }] : [] } : {}));
  const READ = { ok: true, read: { amount: 250000, rate_kind: "interest_rate", rate: 8.5, term_months: 60, payment_frequency: "monthly", expiry_date: "2026-12-01", fees: [], conditions: [{ title: "Void cheque", description: null, owner: "client", requires_document: true }, { title: "Lender site visit", description: null, owner: "lender", requires_document: false }], lender_name: null, product_name: null, payment_amount: null } };
  const show = (onSaved = vi.fn()) => render(<MemoryRouter><IssueTermSheet applicationId="app-1" onSaved={onSaved} /></MemoryRouter>);

  it("the lender's term sheet: read as soon as it is chosen, saved with the ticked conditions, no pricing change", async () => {
    withTemplate(true);
    h.read.mockResolvedValue(READ);
    h.upload.mockResolvedValue({ ok: true, offer_id: "o1" });
    h.api.post.mockResolvedValue({ ok: true });
    const onSaved = vi.fn();
    show(onSaved);
    fireEvent.change(await screen.findByLabelText("Lender"), { target: { value: "lp-1" } });
    expect(screen.getByTestId("issue-sheet-lender")).toBeChecked();
    const file = new File(["x"], "ts.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("The lender's term sheet"), { target: { files: [file] } });
    await waitFor(() => expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("250000"));
    expect((screen.getByLabelText("Rate") as HTMLInputElement).value).toBe("8.5%");
    expect(screen.queryByLabelText("Our rate")).toBeNull();
    fireEvent.click(screen.getByLabelText("Lender site visit")); // untick
    fireEvent.click(screen.getByTestId("issue-save"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(h.upload).toHaveBeenCalledWith("app-1", "lp-1", file, expect.objectContaining({ amount: "250000", rate_factor: "8.5%" }));
    expect(h.api.patch).not.toHaveBeenCalled();
    expect(h.api.post).toHaveBeenCalledWith("/api/broker-tools/applications/app-1/conditions/confirm", { offer_id: "o1", conditions: [{ title: "Void cheque", description: null, owner: "client", requires_document: true }] });
    expect(h.api.post).not.toHaveBeenCalledWith("/api/licensee-documents/offers/o1/term-sheet", {});
  });

  it("our template with a lender: our rate and fees, the template is filled, the lender stays named", async () => {
    withTemplate(true);
    h.read.mockResolvedValue(READ);
    h.upload.mockResolvedValue({ ok: true, offer_id: "o2" });
    h.api.post.mockResolvedValue({ ok: true });
    h.api.patch.mockResolvedValue({ ok: true });
    show();
    fireEvent.change(await screen.findByLabelText("Lender"), { target: { value: "lp-1" } });
    await waitFor(() => expect(screen.getByTestId("issue-sheet-template")).not.toBeDisabled());
    fireEvent.click(screen.getByTestId("issue-sheet-template"));
    fireEvent.change(screen.getByLabelText("The lender's term sheet"), { target: { files: [new File(["x"], "ts.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("250000"));
    fireEvent.change(screen.getByLabelText("Our rate"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Lender commission"), { target: { value: "2500" } });
    fireEvent.click(screen.getByTestId("issue-save"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/licensee-documents/offers/o2/term-sheet", {}));
    expect(h.api.patch).toHaveBeenCalledWith("/api/offers/o2/pricing", expect.objectContaining({ term_sheet_mode: "template", client_rate: "10", lender_commission: "2500" }));
  });

  it("no template uploaded yet: that choice is off and points to Settings", async () => {
    withTemplate(false);
    show();
    fireEvent.change(await screen.findByLabelText("Lender"), { target: { value: "lp-1" } });
    expect(await screen.findByTestId("issue-no-template")).toHaveTextContent("has not uploaded its template yet");
    expect(screen.getByTestId("issue-sheet-template")).toBeDisabled();
    expect(screen.getByRole("link", { name: /Upload it in Settings/ })).toHaveAttribute("href", "/settings/your-documents");
  });

  it("no outside lender: only our template, no upload, no lender named", async () => {
    withTemplate(true);
    h.api.post.mockImplementation(async (url: string) => (url === "/api/offers" ? { offer: { id: "o9" } } : { ok: true }));
    h.api.patch.mockResolvedValue({ ok: true });
    show();
    fireEvent.change(await screen.findByLabelText("Lender"), { target: { value: "__ours__" } });
    expect(screen.queryByLabelText("The lender's term sheet")).toBeNull();
    expect(screen.getByTestId("issue-sheet-lender")).toBeDisabled();
    expect(screen.getByTestId("issue-sheet-template")).toBeChecked();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100000" } });
    fireEvent.change(screen.getByLabelText("Our rate"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Set-up fee"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Add a condition"), { target: { value: "Void cheque" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByTestId("issue-save"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/broker-tools/applications/app-1/conditions/confirm", expect.objectContaining({ offer_id: "o9" })));
    expect(h.api.post).toHaveBeenCalledWith("/api/offers", expect.objectContaining({ applicationId: "app-1", amount: "100000" }));
    expect(h.api.patch).toHaveBeenCalledWith("/api/offers/o9/pricing", expect.objectContaining({ term_sheet_mode: "ours", client_rate: "7", setup_fee: "500" }));
    expect(h.api.post).toHaveBeenCalledWith("/api/licensee-documents/offers/o9/term-sheet", {});
  });
});

describe("step 3: conditions checklist", () => {
  const C = (over: Record<string, unknown>) => ({ id: "c1", title: "Void cheque", description: "For pre-authorized payments.", owner: "client", assigned_user_id: null, due_date: null, status: "open", requires_document: true, document_id: null, document_url: null, waived_reason: null, client_submitted_at: null, overdue: false, ...over });
  it("one line each, grouped by who acts; a tick marks it done", async () => {
    h.api.get.mockImplementation(async (url: string) => (url.endsWith("/conditions") ? { conditions: [C({}), C({ id: "c2", title: "Lender's final approval", owner: "lender", status: "cleared" }), C({ id: "c3", title: "Register the security", owner: "staff" })] } : { people: [] }));
    h.api.patch.mockResolvedValue({ ok: true });
    render(<ConditionsChecklist applicationId="app-1" />);
    expect(await screen.findByTestId("conditions-count")).toHaveTextContent("1 of 3 done");
    expect(screen.getByTestId("conditions-group-client")).toHaveTextContent("Waiting on client");
    expect(screen.getByTestId("conditions-group-lender")).toHaveTextContent("Done");
    expect(screen.getByTestId("conditions-group-staff")).toHaveTextContent("To do");
    expect(screen.queryByText("For pre-authorized payments.")).toBeNull(); // detail stays behind More
    fireEvent.click(screen.getByLabelText("Done: Void cheque"));
    await waitFor(() => expect(h.api.patch).toHaveBeenCalledWith("/api/broker-tools/applications/app-1/conditions/c1", { status: "cleared" }));
    fireEvent.click(screen.getByTestId("condition-more-c1"));
    expect(screen.getByText("For pre-authorized payments.")).toBeInTheDocument();
    expect(screen.getByTestId("condition-waive-c1")).toHaveTextContent("Not needed");
  });

  it("adds a condition for the client in one line", async () => {
    h.api.get.mockImplementation(async (url: string) => (url.endsWith("/conditions") ? { conditions: [] } : { people: [] }));
    h.api.post.mockResolvedValue({ ok: true });
    render(<ConditionsChecklist applicationId="app-1" />);
    expect(await screen.findByTestId("conditions-count")).toHaveTextContent("No conditions yet.");
    fireEvent.click(screen.getByTestId("condition-add-open"));
    fireEvent.change(screen.getByLabelText("New condition"), { target: { value: "Insurance certificate" } });
    fireEvent.click(screen.getByTestId("condition-add"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/broker-tools/applications/app-1/conditions", expect.objectContaining({ title: "Insurance certificate", owner: "client" })));
  });
});

describe("close tab", () => {
  it("starts from the signed offer, saves, and marks a line received", async () => {
    let saved = false;
    h.api.get.mockImplementation(async () => (saved
      ? { saved: true, close: { id: "c1", closed_on: "2026-11-11", currency: "CAD", funded_amount: 250000, rate: "8.5%", term_months: 60, payment_frequency: "Monthly", lender_name: "Northern Capital", broker_user_id: "u1", lead_source: "company", clawback_days: 30, residual_percent: null, residual_months: null, notes: null },
          lines: [{ id: "l1", kind: "lender_commission", description: "Lender commission", basis: "percent", percent: 2, expected_amount: 5000, status: "expected" }] }
      : { saved: false, suggested: { closed_on: "2026-11-11", currency: "CAD", funded_amount: 250000, rate: "8.5%", term_months: 60, payment_frequency: "Monthly", lender_name: "Northern Capital", broker_user_id: "u1", lead_source: "company", clawback_days: 30, residual_percent: null, residual_months: null, notes: null, referral_partner: "Todd",
          lines: [{ kind: "lender_commission", description: "Lender commission", basis: "percent", percent: 2, expected_amount: 5000 }, { kind: "referral_fee", description: "Referral fee owed to Todd (20%)", basis: "flat", percent: null, expected_amount: 1000 }] } }));
    h.api.put.mockImplementation(async (_url: string, body: any) => { saved = true; return { saved: true, close: { ...body, id: "c1" }, lines: [{ id: "l1", kind: "lender_commission", description: "Lender commission", basis: "percent", percent: 2, expected_amount: 5000, status: "expected" }] }; });
    h.api.post.mockResolvedValue({ ok: true });
    render(<CloseTab applicationId="app-1" />);
    expect(await screen.findByTestId("close-expected")).toHaveTextContent("$5,000");
    expect(screen.getByText(/ours after referral/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("close-save"));
    await waitFor(() => expect(h.api.put).toHaveBeenCalledWith("/api/deals/applications/app-1/close", expect.objectContaining({ funded_amount: 250000, currency: "CAD" })));
    fireEvent.click(await screen.findByTestId("close-received-0"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/deals/lines/l1/received", expect.objectContaining({ amount: "5000" })));
    expect(screen.getByTestId("payments")).toBeInTheDocument();
  });
});
