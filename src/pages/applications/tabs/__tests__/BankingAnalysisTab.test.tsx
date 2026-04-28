// BF_BANKING_ANALYSIS_TAB_v52 — regression test.
// 1) Empty state when applicationId is missing.
// 2) Renders fetched BankingAnalysis fields.
// 3) Surfaces error state on rejection.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/api/banking", () => ({
  fetchBankingAnalysis: vi.fn(),
}));

import BankingAnalysisTab from "../BankingAnalysisTab";
import { fetchBankingAnalysis } from "@/api/banking";

beforeEach(() => {
  (fetchBankingAnalysis as any).mockReset();
});

describe("BankingAnalysisTab", () => {
  it("renders empty state when applicationId is missing", () => {
    render(<BankingAnalysisTab />);
    expect(screen.getByText(/no application selected/i)).toBeInTheDocument();
  });

  it("renders fetched analysis fields", async () => {
    (fetchBankingAnalysis as any).mockResolvedValue({
      applicationId: "app-1",
      bankingCompletedAt: "2026-04-20T12:00:00.000Z",
      banking_completed_at: "2026-04-20T12:00:00.000Z",
      bankCount: 3,
      documentsAnalyzed: 2,
      status: "analysis_in_progress",
      monthGroups: [],
    });
    render(<BankingAnalysisTab applicationId="app-1" />);
    await waitFor(() => {
      expect(screen.getByText(/analysis is running in the background/i)).toBeInTheDocument();
    });
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/analysis is running in the background/i)).toBeInTheDocument();
  });

  it("renders error state on rejection", async () => {
    (fetchBankingAnalysis as any).mockRejectedValue(new Error("boom"));
    render(<BankingAnalysisTab applicationId="app-2" />);
    await waitFor(() => {
      expect(screen.getByText(/couldn't load banking analysis/i)).toBeInTheDocument();
    });
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
