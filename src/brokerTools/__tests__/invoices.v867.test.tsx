// BF_PORTAL_v867_BROKER_TOOLS_INVOICES - Deal desk > Vendor invoices: read, correct and confirm.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, patch: h.patch, delete: h.del }, rawApiFetch: vi.fn() }));

import InvoicesPanel, { equipmentLine } from "../InvoicesPanel";

const data = {
  vendor_name: "Prairie Equipment Ltd.", vendor_tax_number: null, invoice_number: "INV-2041", invoice_date: "2026-10-03", currency: "CAD",
  line_items: [{ description: "Excavator", amount: 85000 }], subtotal: 85000, taxes: [{ label: "GST 5%", amount: 4250 }], total: 89250,
  equipment: [{ description: "Kubota KX040", year: 2024, make: "Kubota", model: "KX040", serial_number: "KX040-55l23", vin: null, condition: "new" as const, cost: 85000 }],
};
const draft = { id: "i1", status: "draft", file_name: "inv.pdf", data, warnings: ["\"Kubota KX040\" has no serial number or VIN."], read_error: null, assets_contract_id: null, confirmed_at: null };

beforeEach(() => { for (const f of Object.values(h)) f.mockReset(); });

describe("vendor invoices panel", () => {
  it("describes equipment in one line", () => {
    expect(equipmentLine(data.equipment[0]!)).toBe("Kubota KX040 (S/N KX040-55l23) $85,000.00");
    expect(equipmentLine({ ...data.equipment[0]!, description: "", vin: "1M8GDM9AXKP042788", cost: null })).toBe("2024 Kubota KX040 (VIN 1M8GDM9AXKP042788)");
  });

  it("reads the picked document, shows the checks, and confirms with the staff correction", async () => {
    let invoices: unknown[] = [];
    h.get.mockImplementation(async (url: string) => (url.endsWith("/invoice-documents")
      ? { documents: [{ id: "d1", filename: "Kubota invoice.pdf", category: "equipment_invoice", likely_invoice: true }] }
      : { invoices }));
    h.post.mockImplementation(async (url: string) => { if (url.endsWith("/read")) invoices = [draft]; return { ok: true }; });
    h.patch.mockResolvedValue({ ok: true });
    render(<InvoicesPanel applicationId="app-1" />);
    await waitFor(() => expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("d1"));
    fireEvent.click(screen.getByRole("button", { name: "Read invoice" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/invoices/read", { document_id: "d1" }));
    expect((await screen.findByTestId("invoice-warnings")).textContent).toContain("no serial number");
    fireEvent.change(screen.getByLabelText("Serial 1"), { target: { value: "KX040-55123" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and fill the deal" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/invoices/i1/confirm"));
    expect(h.patch.mock.calls[0]?.[1].equipment[0].serial_number).toBe("KX040-55123");
  });
});
