// BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS - the options grid, the structuring panel and the rate card grid.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put, delete: h.del }, rawApiFetch: vi.fn() }));

import StructuringPanel from "../StructuringPanel";
import { grid } from "../RateCardsSettings";
import { optionGrid, rateText, type PaymentOption } from "../structuring";

const opt = (o: Partial<PaymentOption>): PaymentOption => ({ card_id: "c1", lender_name: "Northern", product_name: "Equipment", card_name: "EQ", rate_kind: "apr", rate: 8.9, tier: "any",
  term_months: 36, financed: 80000, residual: 0, payment: 2540.1, payment_tax: [{ label: "GST 5%", amount: 127.01 }], payment_with_tax: 2667.11, upfront: [], upfront_total: 0,
  total_of_payments: 96015.96, cost_of_borrowing: 11443.6, ...o });

beforeEach(() => { for (const f of Object.values(h)) f.mockReset(); });

describe("structuring", () => {
  it("lays options out one lender per row, one term per column, cheapest lender first", () => {
    const g = optionGrid([opt({ card_id: "c2", lender_name: "Quick", payment_with_tax: 3000 }), opt({}), opt({ term_months: 48, payment_with_tax: 2100 })]);
    expect(g.terms).toEqual([36, 48]);
    expect(g.rows.map((r) => r.key)).toEqual(["c1", "c2"]);
    expect(rateText({ rate_kind: "factor", rate: 1.3 })).toBe("factor 1.30");
  });

  it("starts from the deal's cost and province, compares, and saves the chosen option", async () => {
    h.get.mockResolvedValue({ defaults: { amount: 86500, province: "AB", tier: "B" }, saved: null });
    h.post.mockResolvedValue({ options: [opt({}), opt({ card_id: "c2", lender_name: "Quick", payment_with_tax: 2900 })] });
    render(<StructuringPanel applicationId="app-1" />);
    await waitFor(() => expect((screen.getByLabelText("Equipment cost") as HTMLInputElement).value).toBe("86500"));
    fireEvent.click(screen.getByRole("button", { name: "Compare lenders" }));
    expect((await screen.findByTestId("options-grid")).textContent).toContain("$2,667.11/mo");
    fireEvent.click(screen.getAllByRole("button", { name: "Choose" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Save with the chosen option" }));
    await waitFor(() => expect(h.post).toHaveBeenLastCalledWith("/api/deal-desk/applications/app-1/structure", expect.objectContaining({ save: true, chosen: 0, amount: "86500", province: "AB", tier: "B" })));
  });

  it("shows a rate card as a grid of amount bands by term", () => {
    const g = grid([{ term_months: 48, amount_min: 0, amount_max: null, tier: "any", rate: 9.4 }, { term_months: 36, amount_min: 0, amount_max: null, tier: "any", rate: 8.9 },
      { term_months: 36, amount_min: 0, amount_max: null, tier: "A", rate: 7.5 }]);
    expect(g.terms).toEqual([36, 48]);
    expect(g.rows).toEqual([{ label: "$0 - and up", rates: { 36: 8.9, 48: 9.4 } }, { label: "$0 - and up (tier A)", rates: { 36: 7.5 } }]);
  });
});
