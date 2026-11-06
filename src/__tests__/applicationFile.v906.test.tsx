// BF_PORTAL_v906_APPLICATION_FILE - Todd's review of the application file: pipeline search, fee payments from an agreement
// or invoice, banking analysis polling and insights, standard financial lines, upload categories, credit summary step
// states, readable pass reasons, quote layout and term sheets, ID verification not connected, offer conditions,
// deal desk help, SBA tab only on SBA files, and a fraud score that is not shown as final while checks run.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => {
  const fn = vi.fn();
  return { api: Object.assign(fn, { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }), raw: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.api, rawApiFetch: h.raw, default: h.api }));
vi.mock("@/api/banking", () => ({ fetchBankingAnalysis: vi.fn() }));
// The Deal desk's panels load their own data; the test checks only the help text around them.
vi.mock("@/brokerTools/InvoicesPanel", () => ({ default: () => null }));
vi.mock("@/brokerTools/CreditLinesPanel", () => ({ default: () => null }));
vi.mock("@/brokerTools/StructuringPanel", () => ({ default: () => null }));
vi.mock("@/brokerTools/ScorecardPanel", () => ({ default: () => null }));
vi.mock("@/brokerTools/ContractsPanel", () => ({ default: () => null }));
vi.mock("@/brokerTools/CreditBureauPanel", () => ({ default: () => null }));

import PipelinePage from "@/pages/pipeline/PipelinePage";
import BankingAnalysisTab, { bankingIsRunning } from "@/pages/applications/tabs/BankingAnalysisTab";
import { fetchBankingAnalysis } from "@/api/banking";
import FinancialsTab from "@/pages/applications/tabs/FinancialsTab";
import { financialLineFor } from "@/pages/applications/tabs/financialLines";
import { uploadCategories } from "@/pages/applications/tabs/DocumentsTab";
import CreditSummaryV2 from "@/pages/applications/_shared/CreditSummaryV2";
import { RejectReasonsModal } from "@/components/applications/RejectReasonsModal";
import { contrast } from "@/fraud/status";
import { applyReadToOption, termSheetFields, type ReadOffer } from "@/quotes/offerReaderApi";
import IdVerificationTab from "@/kyc/IdVerificationTab";
import DealDeskTab, { DEAL_DESK_HELP } from "@/brokerTools/DealDeskTab";
import FundingConditionsPanel from "@/brokerTools/FundingConditionsPanel";
import { scoreIsFinal } from "@/fraud/FraudTab";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

beforeEach(() => {
  h.api.mockReset(); h.api.get.mockReset(); h.api.post.mockReset(); h.api.put.mockReset(); h.raw.mockReset();
  (fetchBankingAnalysis as any).mockReset();
});

describe("pipeline search", () => {
  it("searches every stage on the server with q", async () => {
    h.api.mockResolvedValue({ items: [] });
    render(<MemoryRouter><PipelinePage /></MemoryRouter>);
    const box = await screen.findByTestId("pipeline-search");
    fireEvent.change(box, { target: { value: "acme 403" } });
    await waitFor(() => expect(h.api).toHaveBeenCalledWith("/api/portal/applications", expect.objectContaining({ params: expect.objectContaining({ q: "acme 403" }) })), { timeout: 2000 });
    expect(await screen.findByTestId("pipeline-count")).toHaveTextContent('0 matches for "acme 403"');
  });
});

describe("banking analysis", () => {
  const ready = {
    status: "analysis_complete", bankCount: 1, documentsAnalyzed: 1, monthsSource: "transactions",
    monthGroups: [{ month: "2026-01-01", deposits: 7000, withdrawals: 1248, net: 5752, endingBalance: 1900, nsfCount: 1, averageBalance: 2000, daysNegative: 1 }],
    inflows: { totalDeposits: 7000 }, outflows: { totalWithdrawals: 1248 },
    documents: [{ document_id: "d1", filename: "jan.pdf", pages: 2, usable_count: 4 }],
    statements: [{ document_id: "d1", periodStart: "2026-01-02", periodEnd: "2026-01-31", openingBalance: 0, closingBalance: 1900, deposits: 7000, withdrawals: 1248, transactionCount: 4, nsfCount: 1 }],
    insights: { nsfCount: 1, daysNegative: 2, transactionCount: 4, topPayees: [{ name: "ACME SUPPLY", total: 900, count: 1 }], topPayors: [{ name: "CLIENT ABC", total: 5000, count: 2 }], lenderPayments: [{ name: "ONDECK CAPITAL", total: 2400, count: 2, months: 2, averagePayment: 1200 }] },
  };
  it("shows the monthly table, NSFs, days negative, lender payments and what the OCR read", async () => {
    (fetchBankingAnalysis as any).mockResolvedValue(ready);
    h.api.get.mockResolvedValue({ transactions: [{ document_id: "d1", date: "2026-01-02", description: "SALES", amount: 5000, balance: 5000, is_nsf: false }] });
    render(<BankingAnalysisTab applicationId="app-1" />);
    const monthly = await screen.findByTestId("banking-monthly");
    expect(within(monthly).queryByText("No monthly data yet.")).toBeNull();
    expect(within(monthly).getByText("$5,752")).toBeInTheDocument();
    expect(screen.getByTestId("banking-nsf-count")).toHaveTextContent("1");
    expect(screen.getByTestId("banking-days-negative")).toHaveTextContent("2");
    expect(within(screen.getByTestId("banking-lender-payments")).getByText("ONDECK CAPITAL")).toBeInTheDocument();
    expect(within(screen.getByTestId("banking-payors")).getByText(/CLIENT ABC/)).toBeInTheDocument();
    const ocr = screen.getByTestId("ocr-read-d1");
    expect(within(ocr).getByText("2026-01-02 to 2026-01-31")).toBeInTheDocument();
    ocr.setAttribute("open", "");
    fireEvent(ocr, new Event("toggle"));
    await waitFor(() => expect(h.api.get).toHaveBeenCalledWith("/api/applications/app-1/banking-analysis/transactions", { params: { document_id: "d1" } }));
    expect(await within(ocr).findByText("SALES")).toBeInTheDocument();
  });
  it("re-runs without a reload message and says the page updates by itself", async () => {
    (fetchBankingAnalysis as any).mockResolvedValue(ready);
    h.api.post.mockResolvedValue({ queued: true });
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    render(<BankingAnalysisTab applicationId="app-1" />);
    fireEvent.click(await screen.findByTestId("banking-rerun"));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/applications/app-1/banking-analysis/retry", {}));
    expect(await screen.findByTestId("banking-running")).toHaveTextContent("updates by itself");
    expect(alert).not.toHaveBeenCalled();
  });
  it("counts queued and in-progress states as running", () => {
    expect(bankingIsRunning({ status: "pending" })).toBe(true);
    expect(bankingIsRunning({ status: "analysis_complete", running: false })).toBe(false);
    expect(bankingIsRunning({ status: "analysis_in_progress" })).toBe(true);
  });
});

describe("financials tab", () => {
  it("maps lines to the standard statement lines and leaves other fields out", () => {
    expect(financialLineFor("Total Revenue")?.key).toBe("revenue");
    expect(financialLineFor("Net income (loss)")?.key).toBe("net_income");
    expect(financialLineFor("Total current assets")?.key).toBe("current_assets");
    expect(financialLineFor("Total assets")?.key).toBe("total_assets");
    expect(financialLineFor("Current portion of long-term debt")?.key).toBe("current_ltd");
    expect(financialLineFor("Long term debt")?.key).toBe("long_term_debt");
    expect(financialLineFor(null, "accounts_receivable")?.key).toBe("ar");
    for (const other of ["Email", "Invoice Date", "Terms", "Title", "Business Name", "Company Start Date"]) expect(financialLineFor(other)).toBeNull();
  });
  it("shows statement lines in order and the rest under Document details", async () => {
    h.api.get.mockResolvedValue({
      documents: [{ documentId: "d1", category: "financial", filename: "fs.pdf", status: "accepted", ocrStatus: "completed", uploadedAt: "2026-01-01T00:00:00Z" }],
      fields: [
        { documentId: "d1", sourceDocumentType: null, fieldKey: "total_assets", displayLabel: "Total assets", value: "500000", confidence: 0.9 },
        { documentId: "d1", sourceDocumentType: null, fieldKey: "email", displayLabel: "Email", value: "owner@example.com", confidence: 0.9 },
        { documentId: "d1", sourceDocumentType: null, fieldKey: "revenue", displayLabel: "Revenue", value: "900000", confidence: 0.9 },
      ],
    });
    render(<FinancialsTab applicationId="app-1" />);
    await screen.findByText("Revenue");
    const rows = screen.getAllByRole("row").slice(1).map((r) => r.querySelector("th")?.textContent);
    expect(rows).toEqual(["Revenue", "Total assets"]);
    const details = screen.getByTestId("financials-document-details");
    expect(within(details).getByText("Email")).toBeInTheDocument();
    expect(within(details).getByText("owner@example.com")).toBeInTheDocument();
  });
});

describe("upload categories", () => {
  it("lists the file's required documents, the staff categories, and Other last, without duplicates", () => {
    const list = uploadCategories([{ label: "Equipment quote / invoice of equipment", document_type: "equipment_quote" }, { label: "A/R", document_type: "accounts_receivable" }]);
    expect(list[0]).toBe("Equipment quote / invoice of equipment");
    expect(list.filter((c) => c === "A/R")).toHaveLength(1);
    expect(list).toContain("Purchase order");
    expect(list).toContain("Media invoice");
    expect(list[list.length - 1]).toBe("Other");
    expect(list.filter((c) => c === "Other")).toHaveLength(1);
  });
});

describe("credit summary steps", () => {
  it("shows each button's last result", async () => {
    h.raw.mockImplementation(async (path: string) => ({
      ok: true,
      json: async () => path.endsWith("/steps")
        ? { steps: [{ step: "financials", status: "failed", message: "No text", started_at: null, finished_at: null }, { step: "research", status: "done", message: null, started_at: null, finished_at: "2026-11-01T10:00:00Z" }] }
        : { summary: null },
    }));
    render(<CreditSummaryV2 applicationId="app-1" />);
    expect(await screen.findByTestId("cs2-step-financials-status")).toHaveTextContent("Failed");
    expect(screen.getByTestId("cs2-step-collateral-status")).toHaveTextContent("Not run");
    expect(screen.getByTestId("cs2-step-research-status")).toHaveTextContent("Done");
    expect(screen.getByRole("button", { name: "1. Read financials" })).toBeInTheDocument();
    expect(screen.getByTestId("cs2-generate")).toHaveTextContent("4. Generate credit summary");
  });
});

describe("record pass reasons are readable", () => {
  it("the picked state and the disabled button meet contrast", async () => {
    expect(contrast("#7f1d1d", "#fef2f2")).toBeGreaterThanOrEqual(7);
    expect(contrast("#334155", "#e2e8f0")).toBeGreaterThanOrEqual(4.5);
    h.api.get.mockResolvedValue({ reasons: [{ code: "credit", label: "Credit score below minimum", why_it_matters: "", what_helps: "Time" }] });
    render(<QueryClientProvider client={new QueryClient()}><RejectReasonsModal mode="lender" lenderName="Acme" onCancel={() => undefined} onSubmit={() => undefined} /></QueryClientProvider>);
    const reason = await screen.findByTestId("reject-reason-credit");
    expect(screen.getByTestId("reject-submit")).toHaveStyle({ color: "#334155" });
    fireEvent.click(within(reason).getByRole("checkbox"));
    expect(reason).toHaveAttribute("data-picked", "true");
  });
});

describe("quote from a term sheet", () => {
  const read: ReadOffer = { lender_name: "Acme Capital", product_name: null, amount: 250000, rate_kind: "factor_rate", rate: 1.3, term_months: 12, payment_amount: 1500, payment_frequency: "weekly", expiry_date: "2026-12-01", fees: [{ label: "Admin", amount: 495 }], conditions: [] };
  it("fills the term sheet form and the quote option's gaps", () => {
    expect(termSheetFields(read)).toEqual({ amount: "250000", rate: "1.3 factor", term: "12 months", payment: "Weekly", expiry: "2026-12-01" });
    const o = applyReadToOption({ offer_id: "o1", lender_name: "Acme", product_name: null, amount: 0, term_months: null, rate_kind: "interest_rate", rate: null, payment_frequency: "monthly", payment_amount: null, payment_overridden: false, fees: [], recommended: false, notes: null }, read);
    expect(o).toMatchObject({ lender_name: "Acme", amount: 250000, term_months: 12, rate_kind: "factor_rate", rate: 1.3, payment_frequency: "weekly", payment_amount: 1500, payment_overridden: true });
    expect(o.fees).toEqual([{ label: "Admin", amount: 495, deducted: true, taxable: false }]);
  });
});

describe("ID verification without a service", () => {
  it("says Not connected and where to set it up instead of an active send button", async () => {
    h.api.get.mockResolvedValue({ ok: true, application_id: "app-1", provider: { key: "manual", label: "Manual review", configured: true, hosted: false }, people: [], verifications: [] });
    render(<IdVerificationTab applicationId="app-1" />);
    expect(await screen.findByTestId("kyc-not-connected")).toHaveTextContent("Settings → Risk and ID checks");
    expect(screen.queryByRole("button", { name: "Send verification request" })).toBeNull();
    expect(screen.getByTestId("kyc-vs-tamper")).toHaveTextContent("checks the person");
    expect(screen.getByTestId("kyc-manual")).toBeInTheDocument();
  });
});

describe("funding conditions from the offer document", () => {
  it("lists the conditions read from the offer and adds only the ticked ones", async () => {
    h.api.get.mockImplementation(async (url: string) => url.includes("/api/quotes/") ? { quotes: [], offers: [{ id: "o1", lender_name: "Acme" }] } : url.includes("/people") ? { people: [] } : { conditions: [] });
    h.api.post.mockImplementation(async (url: string) => url.endsWith("/offer-document/read")
      ? { ok: true, offer_id: "o1", read: { conditions: [{ title: "Signed guarantee", description: null, owner: "client", requires_document: true }, { title: "Site visit", description: null, owner: "lender", requires_document: false }] } }
      : { conditions: [], added: 1, skipped: [] });
    render(<FundingConditionsPanel applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Read Acme's term sheet" }));
    const list = await screen.findByTestId("proposed-conditions");
    fireEvent.click(within(list).getByLabelText("Add Site visit"));
    fireEvent.click(within(list).getByRole("button", { name: "Add 1 condition" }));
    await waitFor(() => expect(h.api.post).toHaveBeenCalledWith("/api/broker-tools/applications/app-1/conditions/confirm", {
      offer_id: "o1", conditions: [{ title: "Signed guarantee", description: null, owner: "client", requires_document: true }],
    }));
  });
});

describe("deal desk help", () => {
  it("introduces the tab and explains every section", () => {
    h.api.get.mockResolvedValue({});
    render(<DealDeskTab applicationId="app-1" />);
    expect(screen.getByTestId("deal-desk-intro")).toBeInTheDocument();
    for (const help of Object.values(DEAL_DESK_HELP)) expect(screen.getByText(help.text)).toBeInTheDocument();
  });
});

describe("fraud score while checks run", () => {
  it("is not final while checks run or documents wait", () => {
    const score = { score: 45, band: "medium" as const, reasons: [], covered: [], not_covered: [] };
    expect(scoreIsFinal({ ...score, complete: false }, false)).toBe(false);
    expect(scoreIsFinal({ ...score, complete: false, pending_reason: "2 document(s) are still waiting" }, true)).toBe(false);
    expect(scoreIsFinal({ ...score, complete: true }, false)).toBe(true);
  });
});
