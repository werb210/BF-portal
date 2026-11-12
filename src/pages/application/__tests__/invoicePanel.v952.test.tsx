// BF_PORTAL_v952_INVOICE_TEMPLATES
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ get: vi.fn(), raw: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => h.get(...a) }, rawApiFetch: (...a: unknown[]) => h.raw(...a) }));

import InvoicePanel from "../InvoicePanel";

const show = (props: { suggestedAmount?: number | null } = {}) => render(<MemoryRouter><InvoicePanel applicationId="app-1" {...props} /></MemoryRouter>);

beforeEach(() => {
  h.get.mockReset(); h.raw.mockReset();
  h.get.mockResolvedValue({ has_template: true, invoices: [] });
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:x");
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

describe("Close tab: invoice", () => {
  it("points to Settings when no invoice template is uploaded", async () => {
    h.get.mockResolvedValue({ has_template: false, invoices: [] });
    show();
    expect(await screen.findByTestId("invoice-no-template")).toHaveTextContent("No invoice template has been uploaded yet");
    expect(screen.queryByTestId("invoice-make")).toBeNull();
  });

  it("starts from the file's broker fee and shows the total with tax", async () => {
    show({ suggestedAmount: 5000 });
    const amount = await screen.findByTestId("invoice-amount") as HTMLInputElement;
    expect(amount.value).toBe("5000");
    fireEvent.change(screen.getByTestId("invoice-tax"), { target: { value: "5" } });
    expect(screen.getByTestId("invoice-total").textContent).toContain("5,250.00");
  });

  it("will not make an invoice without an amount", async () => {
    show();
    expect((await screen.findByTestId("invoice-make") as HTMLButtonElement).disabled).toBe(true);
  });

  it("makes the invoice, says its number and lists it", async () => {
    h.raw.mockResolvedValue({ ok: true, headers: { get: (k: string) => (k === "X-Invoice-Number" ? "INV-01001" : null) }, blob: async () => new Blob(["%PDF-"]) });
    show({ suggestedAmount: 5000 });
    await screen.findByTestId("invoice-make");
    h.get.mockResolvedValue({ has_template: true, invoices: [{ id: "i1", number: "INV-01001", description: "Broker fee", amount: "5000.00", tax: "0.00", total: "5000.00", due_date: "2026-11-27", created_at: "2026-11-12T00:00:00Z" }] });
    fireEvent.click(screen.getByTestId("invoice-make"));
    expect(await screen.findByText("INV-01001 was made and downloaded.")).toBeTruthy();
    const [path, init] = h.raw.mock.calls[0]!;
    expect(path).toBe("/api/licensee-documents/applications/app-1/invoice");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ amount: 5000, description: "Broker fee", tax_percent: 0, due_days: 15 });
    await waitFor(() => expect(screen.getByTestId("invoice-list")).toHaveTextContent("INV-01001"));
  });

  it("shows the server's reason when the invoice cannot be made", async () => {
    h.raw.mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: "Upload your invoice template in Settings first." }) });
    show({ suggestedAmount: 100 });
    fireEvent.click(await screen.findByTestId("invoice-make"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload your invoice template in Settings first.");
  });
});
