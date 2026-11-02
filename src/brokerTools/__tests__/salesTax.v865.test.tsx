// BF_PORTAL_v865_BROKER_TOOLS_3_SALES_TAX - Settings > Deal tools > Sales tax and its calculator.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, put: h.put, delete: h.del } }));

import SalesTaxSettings from "../SalesTaxSettings";
import { rateSummary, taxPreview } from "../salesTaxView";

const on = { province: "ON", effective_from: "2025-04-01", gst: 0, pst: 0, hst: 13, qst: 0, note: null };
const bc = { province: "BC", effective_from: "2025-04-01", gst: 5, pst: 7, hst: 0, qst: 0, note: null };
const qc = { province: "QC", effective_from: "2025-04-01", gst: 5, pst: 0, hst: 0, qst: 9.975, note: null };
const ratesBody = {
  ok: true, rates: [on, bc, qc],
  current: [{ ...bc, name: "British Columbia", combined: 12 }, { ...on, name: "Ontario", combined: 13 }, { ...qc, name: "Quebec", combined: 14.975 }],
  provinces: [{ code: "BC", name: "British Columbia" }, { code: "ON", name: "Ontario" }, { code: "QC", name: "Quebec" }],
};

beforeEach(() => { h.get.mockReset(); h.put.mockReset(); h.del.mockReset(); });

describe("sales tax view", () => {
  it("reads like the tax on an invoice", () => {
    expect(rateSummary(on)).toBe("HST 13%");
    expect(rateSummary(bc)).toBe("GST 5% + PST 7%");
    expect(rateSummary({ ...bc, province: "MB" })).toBe("GST 5% + RST 7%");
    expect(rateSummary(qc)).toBe("GST 5% + QST 9.975%");
    expect(taxPreview(1000, qc)).toEqual({ lines: [{ label: "GST 5%", amount: 50 }, { label: "QST 9.975%", amount: 99.75 }], total: 149.75, withTax: 1149.75 });
  });
});

describe("Settings > Deal tools > Sales tax", () => {
  it("lists today's rates, previews tax, and lets an Admin add a dated rate", async () => {
    h.get.mockResolvedValue(ratesBody);
    h.put.mockResolvedValue({ ok: true });
    render(<SalesTaxSettings isAdmin />);
    expect((await screen.findByTestId("sales-tax-QC")).textContent).toContain("GST 5% + QST 9.975%");
    fireEvent.change(screen.getByLabelText("Calculator province"), { target: { value: "ON" } });
    fireEvent.change(screen.getByLabelText("Calculator amount"), { target: { value: "2000" } });
    expect(screen.getByTestId("sales-tax-preview").textContent).toMatch(/HST 13% \$260\.00/);
    fireEvent.change(screen.getByLabelText("Rate province"), { target: { value: "ON" } });
    fireEvent.change(screen.getByLabelText("HST %"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("Rate as of"), { target: { value: "2027-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rate" }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/broker-tools/sales-tax/rates", expect.objectContaining({ province: "ON", hst: "14", effective_from: "2027-01-01" })));
  });

  it("staff can look but not edit", async () => {
    h.get.mockResolvedValue(ratesBody);
    render(<SalesTaxSettings isAdmin={false} />);
    await screen.findByTestId("sales-tax-ON");
    expect(screen.queryByRole("button", { name: "Save rate" })).toBeNull();
  });
});
