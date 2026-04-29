// BF_LENDERS_TAB_FIX_v55_PORTAL — render funding range + category columns.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/lenders", async () => {
  const actual = await vi.importActual<typeof import("@/api/lenders")>("@/api/lenders");
  return {
    ...actual,
    fetchLenderMatches: vi.fn(),
    createLenderSubmission: vi.fn(),
  };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin" } }) }));
vi.mock("@/auth/can", () => ({ canWrite: () => true }));

import { fetchLenderMatches } from "@/api/lenders";
import LendersTab from "../LendersTab";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("BF_LENDERS_TAB_FIX_v55_PORTAL", () => {
  beforeEach(() => {
    vi.mocked(fetchLenderMatches).mockResolvedValue([
      {
        id: "p-1", lenderName: "Acme Capital",
        productName: "Term Loan A", productCategory: "TERM_LOAN",
        matchPercent: 0.82, amountMin: 25000, amountMax: 250000,
      } as any,
    ]);
  });

  it("renders lender name, category, funding range, and likelihood as columns", async () => {
    render(wrap(<LendersTab applicationId="app-1" />));
    await waitFor(() => expect(screen.getByText("Acme Capital")).toBeTruthy());
    expect(screen.getByText("Term Loan A")).toBeTruthy();
    expect(screen.getByText("TERM_LOAN")).toBeTruthy();
    expect(screen.getByText(/\$25,000\s*–\s*\$250,000/)).toBeTruthy();
    expect(screen.getByText("82%")).toBeTruthy();
  });

  it("renders em-dash when funding range is missing", async () => {
    vi.mocked(fetchLenderMatches).mockResolvedValueOnce([
      { id: "p-2", lenderName: "Beta", productCategory: "LINE_OF_CREDIT",
        matchPercent: 0.7, amountMin: null, amountMax: null } as any,
    ]);
    render(wrap(<LendersTab applicationId="app-2" />));
    await waitFor(() => expect(screen.getByText("Beta")).toBeTruthy());
    expect(screen.getByText("LINE_OF_CREDIT")).toBeTruthy();
    // The "—" appears in the funding range column
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});
