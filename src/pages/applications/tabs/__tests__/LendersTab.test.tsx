// BF_LENDERS_TAB_REAL_v42 — Block 42-B regression pin
// 1) When the API returns matches, the spec UI elements appear.
// 2) Checking + Send fires createLenderSubmission with the right ids.
// 3) When applicationId is empty, render the empty-state placeholder.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/lenders", () => ({
  fetchLenderMatches: vi.fn(),
  createLenderSubmission: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin", id: "u1" } }) }));
vi.mock("@/components/auth/AccessRestricted", () => ({
  default: ({ message }: { message: string }) => <div>{message}</div>,
}));
vi.mock("@/auth/can", () => ({ canWrite: () => true }));
vi.mock("@/utils/errors", () => ({ getErrorMessage: (e: any, fb: string) => e?.message ?? fb }));

import LendersTab from "../LendersTab";
import { fetchLenderMatches, createLenderSubmission } from "@/api/lenders";

function withClient(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  (fetchLenderMatches as any).mockReset();
  (createLenderSubmission as any).mockReset();
});

describe("LendersTab", () => {
  it("renders empty state when no applicationId", () => {
    render(withClient(<LendersTab applicationId={null} />));
    expect(screen.getByText(/select an application/i)).toBeInTheDocument();
  });

  it("renders matches and fires Send with selected ids", async () => {
    (fetchLenderMatches as any).mockResolvedValue([
      { id: "p1", lenderName: "Alpha", productName: "Term", productCategory: "TERM_LOAN", matchPercent: 87 },
      { id: "p2", lenderName: "Beta",  productName: "LOC",  productCategory: "LINE_OF_CREDIT", matchPercent: 64 },
    ]);
    (createLenderSubmission as any).mockResolvedValue({});

    render(withClient(<LendersTab applicationId="app-123" />));

    await screen.findByText("Alpha");
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Likelihood: 87%")).toBeInTheDocument();
    expect(screen.getAllByText(/upload term sheet/i)).toHaveLength(2);

    const sendCheckbox = screen.getByLabelText(/Send to Alpha/i);
    fireEvent.click(sendCheckbox);

    const sendButton = screen.getByRole("button", { name: /Send \(1\)/ });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(createLenderSubmission).toHaveBeenCalledWith("app-123", ["p1"]);
    });
  });
});
