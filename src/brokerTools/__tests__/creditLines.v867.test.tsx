// BF_PORTAL_v867_BROKER_TOOLS_CREDIT_LINES - Deal desk > Approved credit lines.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put, patch: h.patch, delete: h.del }, rawApiFetch: vi.fn() }));

import CreditLinesPanel, { expiryText } from "../CreditLinesPanel";

const line = { id: "l1", lender_name: "Northern Capital", product_name: "Equipment line", limit_amount: 250000, used: 100000, available: 150000, currency: "CAD",
  approved_on: "2026-06-01", expiry_date: "2026-11-21", conditions: "Annual financials", status: "active", days_to_expiry: 20, expiring_soon: true, over_limit: false,
  draws: [{ id: "d1", kind: "draw", source: "manual", amount: 100000, drawn_on: "2026-06-02", note: "Unit 1", reversed: false }] };

beforeEach(() => { for (const f of Object.values(h)) f.mockReset(); });

describe("credit lines panel", () => {
  it("says when a line expires", () => {
    expect(expiryText({ status: "active", expiry_date: "2026-11-21", days_to_expiry: 20 })).toBe("Expires in 20 days (2026-11-21)");
    expect(expiryText({ status: "active", expiry_date: "2026-11-01", days_to_expiry: 0 })).toBe("Expires today");
    expect(expiryText({ status: "expired", expiry_date: "2026-10-01", days_to_expiry: -31 })).toBe("Expired 2026-10-01");
  });

  it("shows limit, used and available, records a draw and links the deal", async () => {
    h.get.mockResolvedValue({ lines: [line], linked_line_id: null });
    h.post.mockResolvedValue({ ok: true });
    h.put.mockResolvedValue({ ok: true });
    render(<CreditLinesPanel applicationId="app-1" />);
    expect((await screen.findByTestId("credit-line-amounts")).textContent).toBe("Limit $250,000.00 - used $100,000.00 - available $150,000.00");
    expect(screen.getByText("Expiring soon")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Amount for Northern Capital"), { target: { value: "25000" } });
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/deal-desk/credit-lines/l1/draws", { amount: "25000", kind: "draw", note: "", application_id: "app-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Draw on this line when this deal funds" }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/credit-line", { credit_line_id: "l1" }));
  });
});
