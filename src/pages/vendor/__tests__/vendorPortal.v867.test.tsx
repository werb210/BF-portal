// BF_PORTAL_v867_BROKER_TOOLS_VENDORS - the vendor portal: quote with the apply link, deals, fees.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ api: vi.fn(), raw: vi.fn() }));
vi.mock("@/api", () => ({ api: h.api, rawApiFetch: h.raw }));

import { VendorHome, feeText } from "../VendorPortal";

const opt = { card_id: "c1", lender_name: "Northern", product_name: "Equipment", card_name: "EQ", rate_kind: "apr", rate: 8.9, tier: "any", term_months: 36, financed: 50000, residual: 0,
  payment: 1587.6, payment_tax: [{ label: "GST 5%", amount: 79.38 }], payment_with_tax: 1666.98, upfront: [], upfront_total: 0, total_of_payments: 60011.28, cost_of_borrowing: 7153.6 };

beforeEach(() => { h.api.mockReset(); h.raw.mockReset(); sessionStorage.setItem("vendor_token", "t"); });

describe("vendor portal", () => {
  it("says what the vendor earns", () => {
    expect(feeText({ fee_pct: 1.5, fee_flat: 250 })).toBe("1.5% of the funded amount plus $250.00 per funded deal");
    expect(feeText({ fee_pct: null, fee_flat: null })).toBe("as agreed");
  });

  it("quotes a customer and shows the apply link; lists deals and fees", async () => {
    h.api.mockImplementation(async (url: string) => {
      if (url.endsWith("/me")) return { vendor: { company_name: "Prairie", contact_name: "Pat Vendor", code: "PRA-1", province: "AB", fee_pct: 1.5, fee_flat: null, fee_terms: null } };
      if (url.endsWith("/deals")) return { deals: [{ application_id: "a1", business_name: "Dig Co", stage: "In Review", requested_amount: "50000", created_at: "", invoices_sent: 0, fee_amount: null, fee_status: null, paid_on: null }] };
      if (url.endsWith("/fees")) return { fees: [{ id: "f1", business_name: "Older deal", fee_amount: "1150.00", status: "paid", paid_on: "2026-10-01" }] };
      if (url.endsWith("/quote")) return { quote: { options: [opt] }, apply_link: "https://client.example/?ref=PRA-1&vq=q1" };
      throw new Error(url);
    });
    render(<MemoryRouter><VendorHome /></MemoryRouter>);
    expect(await screen.findByText("Dig Co - $50,000.00")).toBeTruthy();
    expect(screen.getByText(/Older deal: \$1,150.00 - paid 2026-10-01/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Price before tax"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "Show payments" }));
    await waitFor(() => expect(screen.getByTestId("vendor-quote").textContent).toContain("$1,666.98/mo"));
    expect(screen.getByTestId("vendor-quote").textContent).toContain("https://client.example/?ref=PRA-1&vq=q1");
    const body = JSON.parse(h.api.mock.calls.find((c) => String(c[0]).endsWith("/quote"))![1].body);
    expect(body).toMatchObject({ amount: "50000", province: "AB", terms: "36, 48, 60" });
  });
});
