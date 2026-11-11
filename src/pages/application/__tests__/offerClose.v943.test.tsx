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

import IssueTermSheet from "../IssueTermSheet";
import CloseTab from "../CloseTab";

beforeEach(() => { for (const k of ["get", "post", "put", "patch"] as const) h.api[k].mockReset(); h.upload.mockReset(); h.read.mockReset(); });

describe("give the client a term sheet", () => {
  it("reads the lender's term sheet as soon as it is chosen, then saves it with the ticked conditions", async () => {
    h.read.mockResolvedValue({ ok: true, read: { amount: 250000, rate_kind: "interest_rate", rate: 8.5, term_months: 60, payment_frequency: "monthly", expiry_date: "2026-12-01", fees: [], conditions: [{ title: "Void cheque", description: null, owner: "client", requires_document: true }, { title: "Lender site visit", description: null, owner: "lender", requires_document: false }], lender_name: null, product_name: null, payment_amount: null } });
    h.upload.mockResolvedValue({ ok: true, offer_id: "o1" });
    h.api.post.mockResolvedValue({ ok: true });
    const onSaved = vi.fn();
    render(<IssueTermSheet applicationId="app-1" onSaved={onSaved} />);
    fireEvent.change(await screen.findByLabelText("Lender"), { target: { value: "lp-1" } });
    const file = new File(["x"], "ts.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("The lender's term sheet"), { target: { files: [file] } });
    await waitFor(() => expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("250000"));
    expect((screen.getByLabelText("Rate") as HTMLInputElement).value).toBe("8.5%");
    fireEvent.click(screen.getByLabelText("Lender site visit")); // untick
    fireEvent.click(screen.getByTestId("issue-save"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(h.upload).toHaveBeenCalledWith("app-1", "lp-1", file, expect.objectContaining({ amount: "250000", rate_factor: "8.5%" }));
    expect(h.api.patch).not.toHaveBeenCalled(); // sent as it is: no pricing change
    expect(h.api.post).toHaveBeenCalledWith("/api/broker-tools/applications/app-1/conditions/confirm", { offer_id: "o1", conditions: [{ title: "Void cheque", description: null, owner: "client", requires_document: true }] });
  });

  it("we buy the deal: our rate and fees, our term sheet, no upload", async () => {
    h.api.post.mockImplementation(async (url: string) => (url === "/api/offers" ? { offer: { id: "o9" } } : { ok: true }));
    h.api.patch.mockResolvedValue({ ok: true });
    render(<IssueTermSheet applicationId="app-1" onSaved={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText("Lender"), { target: { value: "__ours__" } });
    expect(screen.queryByLabelText("The lender's term sheet")).toBeNull();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100000" } });
    fireEvent.change(screen.getByLabelText("Our rate"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Lender's rate"), { target: { value: "6%" } });
    fireEvent.change(screen.getByLabelText("Set-up fee"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Add a condition"), { target: { value: "Void cheque" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByTestId("issue-save"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/broker-tools/applications/app-1/conditions/confirm", expect.objectContaining({ offer_id: "o9" })));
    expect(h.api.post).toHaveBeenCalledWith("/api/offers", expect.objectContaining({ applicationId: "app-1", amount: "100000", rate: "6%" }));
    expect(h.api.patch).toHaveBeenCalledWith("/api/offers/o9/pricing", expect.objectContaining({ term_sheet_mode: "ours", client_rate: "7", setup_fee: "500" }));
    expect(h.api.post).toHaveBeenCalledWith("/api/licensee-documents/offers/o9/term-sheet", {});
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
