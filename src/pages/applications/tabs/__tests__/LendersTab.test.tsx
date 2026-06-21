// BF_LENDERS_TAB_REAL_v42 — Block 42-B regression pin
// BF_PORTAL_BLOCK_v180_LENDERS_TAB_TESTS_ENVELOPE_v1
// 1) When the envelope returns ready + matches, the spec UI elements appear.
// 2) Checking + Send fires createLenderSubmission with the right ids.
// 3) When applicationId is empty, render the empty-state placeholder.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/lenders", () => ({
  fetchLenderMatches: vi.fn(),
  fetchLenderEnvelope: vi.fn(),
  recalculateLenderMatches: vi.fn(),
  createLenderSubmission: vi.fn(),
  uploadLenderTermSheet: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin", id: "u1" } }) }));
vi.mock("@/components/auth/AccessRestricted", () => ({
  default: ({ message }: { message: string }) => <div>{message}</div>,
}));
vi.mock("@/auth/can", () => ({ canWrite: () => true }));
vi.mock("@/utils/errors", () => ({ getErrorMessage: (e: any, fb: string) => e?.message ?? fb }));

import LendersTab from "../LendersTab";
import { fetchLenderEnvelope, recalculateLenderMatches, createLenderSubmission, uploadLenderTermSheet } from "@/api/lenders";

function withClient(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  (fetchLenderEnvelope as any).mockReset();
  (recalculateLenderMatches as any).mockReset();
  (createLenderSubmission as any).mockReset();
});

describe("LendersTab", () => {
  it("renders empty state when no applicationId", () => {
    render(withClient(<LendersTab applicationId={null} />));
    expect(screen.getByText(/select an application/i)).toBeInTheDocument();
  });

  it("renders matches and fires Send with selected ids", async () => {
    (fetchLenderEnvelope as any).mockResolvedValue({
      status: "ready",
      outstanding: [],
      computed_at: new Date().toISOString(),
      matches: [
        { id: "p1", lenderName: "Alpha", productName: "Term", productCategory: "TERM_LOAN", matchPercent: 87 },
        { id: "p2", lenderName: "Beta",  productName: "LOC",  productCategory: "LINE_OF_CREDIT", matchPercent: 64 },
      ],
    });
    (createLenderSubmission as any).mockResolvedValue({});

    render(withClient(<LendersTab applicationId="app-123" />));

    await screen.findByText("Alpha");
    expect(screen.getByText("Beta")).toBeInTheDocument();
    // BF_PORTAL_V55_FIX_FOLLOWUP_v55a — likelihood is rendered in its own column.
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("64%")).toBeInTheDocument();
    expect(screen.getByText("TERM_LOAN")).toBeInTheDocument();
    expect(screen.getByText("LINE_OF_CREDIT")).toBeInTheDocument();
    // BF_PORTAL_BLOCK_v186a_LENDERS_TAB_POLISH_TEST_FIXUP_v1
    // v186 moved Upload Term Sheet inside a closed dropdown — assert the
    // files-count buttons (one per match) instead.
    expect(screen.getByTestId("lender-files-p1")).toBeInTheDocument();
    expect(screen.getByTestId("lender-files-p2")).toBeInTheDocument();

    const sendCheckbox = screen.getByLabelText(/Send to Alpha/i);
    fireEvent.click(sendCheckbox);

    const sendButton = screen.getByRole("button", { name: /Send \(1\)/ });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(createLenderSubmission).toHaveBeenCalledWith("app-123", ["p1"]);
    });
  });
});

// BF_PORTAL_BLOCK_v181_LENDERS_TAB_GATING_TESTS_v1
describe("LendersTab gating states", () => {
  it("renders locked panel with outstanding docs when status is locked", async () => {
    (fetchLenderEnvelope as any).mockResolvedValue({
      status: "locked",
      outstanding: ["Bank Statement", "Tax Return"],
      computed_at: null,
      matches: [],
    });

    render(withClient(<LendersTab applicationId="app-locked" />));

    await screen.findByTestId("lenders-locked");
    expect(screen.getByText(/Lender matching is locked/i)).toBeInTheDocument();
    expect(screen.getByText("Bank Statement")).toBeInTheDocument();
    expect(screen.getByText("Tax Return")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send \(/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload Term Sheet/i)).not.toBeInTheDocument();
  });

  it("renders stale banner + Recalculate button + cached matches when status is stale", async () => {
    const computedAt = new Date("2026-05-01T10:00:00Z").toISOString();
    (fetchLenderEnvelope as any).mockResolvedValue({
      status: "stale",
      outstanding: [],
      computed_at: computedAt,
      matches: [
        { id: "p1", lenderName: "Alpha", productName: "Term", productCategory: "TERM_LOAN", matchPercent: 87 },
      ],
    });

    render(withClient(<LendersTab applicationId="app-stale" />));

    await screen.findByText(/Matches are stale/i);
    expect(screen.getByRole("button", { name: /Recalculate/i })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    const sendBtn = screen.getByRole("button", { name: /Send \(0\)/ });
    expect(sendBtn).toBeDisabled();
  });

  it("clicking Recalculate calls recalculateLenderMatches with the application id", async () => {
    (fetchLenderEnvelope as any).mockResolvedValue({
      status: "stale",
      outstanding: [],
      computed_at: new Date().toISOString(),
      matches: [],
    });
    (recalculateLenderMatches as any).mockResolvedValue({
      status: "ready",
      outstanding: [],
      computed_at: new Date().toISOString(),
      matches: [],
    });

    render(withClient(<LendersTab applicationId="app-recalc" />));

    const btn = await screen.findByRole("button", { name: /Recalculate/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(recalculateLenderMatches).toHaveBeenCalledWith("app-recalc");
    });
  });
});


// BF_PORTAL_BLOCK_v186_LENDERS_TAB_POLISH_v1
describe("LendersTab v186 polish", () => {
  beforeEach(() => {
    (uploadLenderTermSheet as any).mockReset();
    (fetchLenderEnvelope as any).mockResolvedValue({ status: "ready", outstanding: [], computed_at: new Date().toISOString(), matches: [{ id: "p1", lenderName: "Alpha", productName: "Term", productCategory: "TERM_LOAN", matchPercent: 87, files: [] }] });
  });

  it("renders files button and upload input", async () => {
    render(withClient(<LendersTab applicationId="app-files" />));
    await screen.findByTestId("lender-files-p1");
    fireEvent.click(screen.getByTestId("lender-files-p1"));
    expect(screen.getByTestId("lender-files-menu-p1")).toBeInTheDocument();
    expect(screen.getByTestId("upload-term-sheet-p1")).toBeInTheDocument();
  });

  it("upload modal calls uploadLenderTermSheet", async () => {
    (uploadLenderTermSheet as any).mockResolvedValue({ ok: true });
    render(withClient(<LendersTab applicationId="app-up" />));
    await screen.findByText("Alpha");
    fireEvent.click(screen.getByTestId("lender-files-p1"));
    const file = new File(["hello"], "ts.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("upload-term-sheet-p1"), { target: { files: [file] } });
    await screen.findByTestId("term-sheet-modal");
    fireEvent.click(screen.getByTestId("term-sheet-submit"));
    await waitFor(() => {
      const call = (uploadLenderTermSheet as any).mock.calls[0];
      expect(call[0]).toBe("app-up");
      expect(call[1]).toBe("p1");
      expect(call[2]).toBe(file);
    });
  });
});
