// BF_PORTAL_v71_BLOCK_2_5
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockGet = vi.fn();
const mockPatch = vi.fn();
vi.mock("@/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import FinancialTab from "../FinancialTab";

const sample = {
  periods: ["2026-01", "2026-02"],
  summary: {
    id: "summary",
    title: "Financial Summary",
    lines: [
      { id: "rev", label: "Revenue", values: { "2026-01": 100000, "2026-02": 110000 } },
      { id: "ebitda", label: "EBITDA", values: { "2026-01": 15000, "2026-02": 18000 } },
    ],
  },
  pnl: { id: "pnl", title: "Profit & Loss", lines: [] },
  balance_sheet: { id: "balance_sheet", title: "Balance Sheet", lines: [] },
  cash_flow: { id: "cash_flow", title: "Cash Flow", lines: [] },
  debt: [
    { id: "d1", lender: "ABC Bank", type: "Term Loan", balance: 50000, monthly_payment: 2500, rate: 0.085 },
  ],
  flags: [{ id: "f1", severity: "warn", text: "DSCR below 1.25" }],
  ratios: { dscr: 1.18, current_ratio: 1.4, quick_ratio: 0.9, debt_to_equity: 2.3 },
};

beforeEach(() => {
  mockGet.mockReset();
  mockPatch.mockReset();
});

describe("FinancialTab", () => {
  it("renders summary, ratios, debt, and flags", async () => {
    mockGet.mockResolvedValueOnce(sample);
    render(<FinancialTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("financial-tab"));
    expect(screen.getByTestId("fin-section-summary")).toBeTruthy();
    expect(screen.getByTestId("ratio-dscr").textContent).toBe("1.18");
    expect(screen.getByTestId("debt-row-d1")).toBeTruthy();
    expect(screen.getByTestId("fin-flags")).toBeTruthy();
  });

  it("editing a cell triggers PATCH", async () => {
    mockGet.mockResolvedValueOnce(sample);
    mockPatch.mockResolvedValueOnce({});
    render(<FinancialTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("financial-tab"));
    // Click the Revenue Jan-26 cell button to enter edit mode
    const revRow = screen.getByTestId("fin-line-rev");
    const buttons = revRow.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]!);
    const input = revRow.querySelector("input");
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value: "120000" } });
    fireEvent.blur(input!);
    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    const [path, body] = mockPatch.mock.calls[0]!;
    expect(path).toContain("/financials");
    expect((body as any).summary.lines[0].values["2026-01"]).toBe(120000);
  });

  it("renders empty state without crashing", async () => {
    mockGet.mockResolvedValueOnce({
      periods: [], summary: { id: "summary", title: "Summary", lines: [] },
      pnl: { id: "pnl", title: "P&L", lines: [] },
      balance_sheet: { id: "bs", title: "BS", lines: [] },
      cash_flow: { id: "cf", title: "CF", lines: [] },
      debt: [], flags: [],
      ratios: { dscr: null, current_ratio: null, quick_ratio: null, debt_to_equity: null },
    });
    render(<FinancialTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("financial-tab"));
    expect(screen.getByTestId("ratio-dscr").textContent).toBe("—");
  });
});
