// BF_PORTAL_v852_CALC_QBO - Settings -> QuickBooks (greyed out when the server is not set up, Connect, Disconnect,
// tax code), the application card's QuickBooks invoice (number, amount, Open / Paid, Retry after a failed sync),
// and the Calculator button (amount pre-filled, Save to file).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  status: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), saveTaxCode: vi.fn(), invoice: vi.fn(), retry: vi.fn(),
}));
vi.mock("../quickbooksApi", async () => ({
  ...(await vi.importActual<any>("../quickbooksApi")),
  quickbooksApi: h,
}));

import QuickBooksCard from "../QuickBooksCard";
import QuickBooksInvoiceBadge, { invoiceLabel } from "../QuickBooksInvoiceBadge";
import CalculatorButton, { amountFrom } from "@/features/loanCalculator/CalculatorButton";

const invoice = { qboInvoiceId: "130", docNumber: "1042", amount: 5000, status: "open" as const, syncState: "ok", lastError: null, attempts: 0, syncedAt: null, url: "https://app.sandbox.qbo.intuit.com/app/invoice?txnId=130" };

beforeEach(() => {
  Object.values(h).forEach((f) => f.mockReset());
});

describe("Settings -> QuickBooks", () => {
  it("not set up on the server: greyed out with the reason, Connect disabled", async () => {
    h.status.mockResolvedValue({ ok: true, configured: false, connected: false, environment: "sandbox", missing: ["QBO_CLIENT_ID", "QBO_CLIENT_SECRET", "QBO_TOKEN_ENCRYPTION_KEY"], reason: "QuickBooks is not set up on the server." });
    render(<QuickBooksCard />);
    expect(await screen.findByTestId("quickbooks-reason")).toHaveTextContent("QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_TOKEN_ENCRYPTION_KEY");
    expect(screen.getByTestId("quickbooks-state")).toHaveTextContent("Not set up");
    expect(screen.getByTestId("quickbooks-connect")).toBeDisabled();
    expect(screen.queryByTestId("quickbooks-tax")).toBeNull();
  });

  it("Connect sends the Admin to the Intuit sign-in page", async () => {
    h.status.mockResolvedValue({ ok: true, configured: true, connected: false, environment: "sandbox", missing: [], connection: null, taxCode: null });
    h.connect.mockResolvedValue({ ok: true, url: "https://appcenter.intuit.com/connect/oauth2?state=abc" });
    const go = vi.fn();
    render(<QuickBooksCard navigateTo={go} />);
    fireEvent.click(await screen.findByTestId("quickbooks-connect"));
    await waitFor(() => expect(go).toHaveBeenCalledWith("https://appcenter.intuit.com/connect/oauth2?state=abc"));
    expect(screen.getByTestId("quickbooks-state")).toHaveTextContent("Not connected (sandbox)");
  });

  it("connected: company, who connected it, Disconnect, and the tax code", async () => {
    h.status.mockResolvedValue({ ok: true, configured: true, connected: true, environment: "production", missing: [], taxCode: "5",
      connection: { realmId: "9341452", companyName: "Boreal Financial", connectedAt: "2026-10-20T12:00:00Z", connectedByName: "Todd W", refreshExpiresAt: null, environment: "production" },
      invoices: { open: 1, paid: 3, failed: 1 } });
    h.disconnect.mockResolvedValue({ ok: true, revoked: true });
    h.saveTaxCode.mockResolvedValue({ ok: true, taxCode: "13" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<QuickBooksCard />);
    expect(await screen.findByText("Boreal Financial")).toBeInTheDocument();
    expect(screen.getByText(/by Todd W/)).toBeInTheDocument();
    expect(screen.getByText("1 failed to sync")).toBeInTheDocument();
    expect((screen.getByTestId("quickbooks-tax") as HTMLInputElement).value).toBe("5");
    fireEvent.change(screen.getByTestId("quickbooks-tax"), { target: { value: "13" } });
    fireEvent.click(screen.getByTestId("quickbooks-tax-save"));
    await waitFor(() => expect(h.saveTaxCode).toHaveBeenCalledWith("13"));
    fireEvent.click(screen.getByTestId("quickbooks-disconnect"));
    await waitFor(() => expect(h.disconnect).toHaveBeenCalled());
    expect(await screen.findByTestId("quickbooks-msg")).toHaveTextContent("revoked at Intuit");
  });
});

describe("application card: QuickBooks invoice", () => {
  it("shows number, amount and Open", async () => {
    h.invoice.mockResolvedValue({ ok: true, configured: true, invoice });
    render(<QuickBooksInvoiceBadge applicationId="app-1" />);
    expect(await screen.findByTestId("qbo-invoice")).toHaveTextContent("QuickBooks invoice - #1042 - $5,000.00 - Open");
    expect(screen.queryByTestId("qbo-invoice-retry")).toBeNull();
    expect(invoiceLabel({ ...invoice, status: "paid" })).toBe("QuickBooks invoice - #1042 - $5,000.00 - Paid");
  });

  it("a failed sync shows the error and Retry, which syncs again", async () => {
    h.invoice.mockResolvedValue({ ok: true, configured: true, invoice: { ...invoice, syncState: "failed", lastError: "QuickBooks POST payment failed (400)" } });
    h.retry.mockResolvedValue({ ok: true, action: "paid", error: null, invoice: { ...invoice, status: "paid" } });
    render(<QuickBooksInvoiceBadge applicationId="app-1" />);
    expect(await screen.findByTestId("qbo-invoice-error")).toHaveTextContent("payment failed");
    fireEvent.click(screen.getByTestId("qbo-invoice-retry"));
    await waitFor(() => expect(h.retry).toHaveBeenCalledWith("app-1"));
    expect(await screen.findByTestId("qbo-invoice")).toHaveTextContent("Paid");
    expect(screen.getByTestId("qbo-invoice-msg")).toHaveTextContent("Synced with QuickBooks.");
  });

  it("shows nothing without an invoice or when QuickBooks is not set up", async () => {
    h.invoice.mockResolvedValue({ ok: true, configured: false, invoice: null });
    const { container } = render(<QuickBooksInvoiceBadge applicationId="app-1" />);
    await waitFor(() => expect(h.invoice).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});

describe("application card: Calculator", () => {
  it("opens with the requested amount and saves the scenario as a note", async () => {
    const save = vi.fn(async () => undefined);
    render(<CalculatorButton requestedAmount={amountFrom("$250,000.00")} title="Acme Ltd" onSaveNote={save} />);
    fireEvent.click(screen.getByTestId("open-calculator"));
    expect(screen.getByTestId("calculator-dialog")).toHaveTextContent("Loan calculator - Acme Ltd");
    expect((screen.getByTestId("calc-amount") as HTMLInputElement).value).toBe("250000");
    fireEvent.change(screen.getByTestId("calc-rate"), { target: { value: "8" } });
    fireEvent.change(screen.getByTestId("calc-term"), { target: { value: "24" } });
    fireEvent.change(screen.getByTestId("calc-frequency"), { target: { value: "weekly" } });
    expect(screen.getByTestId("calc-out-number-of-payments")).toHaveTextContent("104");
    fireEvent.click(screen.getByTestId("calc-save"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect((save.mock.calls[0] as unknown as [string])[0]).toContain("Payment frequency: Weekly");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("calculator-dialog")).toBeNull();
  });

  it("reads amounts the API sends", () => {
    expect(amountFrom(null, "", "250000")).toBe(250000);
    expect(amountFrom(undefined, 0, 1200.5)).toBe(1200.5);
    expect(amountFrom("n/a")).toBeNull();
  });
});
