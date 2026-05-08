// BF_PORTAL_v72_BLOCK_2_6
// BF_PORTAL_BLOCK_v180_LENDERS_TAB_TESTS_ENVELOPE_v1
// v178 changed drawer LendersTab to fetch /lenders/envelope and expect
// {status, outstanding, computed_at, matches}. URL match for /lenders/envelope
// must come BEFORE the bare /lenders check (the latter is a substring of
// the former).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockUpload = vi.fn();
vi.mock("@/api", () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    upload: (...a: unknown[]) => mockUpload(...a),
  },
}));

import LendersTab from "../LendersTab";

const lenders = [
  { id: "L1", name: "ABC Bank", primary: true, amount: 250000, type: "email", likelihood: "high", files: [] },
  { id: "L2", name: "XYZ Capital", amount: 150000, type: "api", likelihood: "medium",
    files: [{ id: "f1", filename: "term-sheet.pdf", url: "https://x" }] },
  { id: "L3", name: "Merchant Growth", amount: 100000, type: "google_sheet", likelihood: "low", files: [] },
];
const pending = [{ id: "OFFER1", lenderName: "XYZ Capital" }];

const readyEnvelope = {
  status: "ready" as const,
  outstanding: [] as string[],
  computed_at: new Date().toISOString(),
  matches: lenders,
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockUpload.mockReset();
});

describe("LendersTab", () => {
  it("renders rows with badges and pending banner", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders/envelope")) return Promise.resolve(readyEnvelope);
      if (url.includes("/offers")) return Promise.resolve(pending);
      return Promise.resolve([]);
    });
    render(<LendersTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("lenders-tab"));
    expect(screen.getByTestId("lender-row-L1")).toBeTruthy();
    expect(screen.getByTestId("pending-acceptance-banner")).toBeTruthy();
    expect(screen.getByTestId("confirm-acceptance-OFFER1")).toBeTruthy();
  });

  it("filters by search", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders/envelope")) return Promise.resolve(readyEnvelope);
      return Promise.resolve([]);
    });
    render(<LendersTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("lenders-tab"));
    fireEvent.change(screen.getByTestId("lenders-search"), { target: { value: "merchant" } });
    expect(screen.queryByTestId("lender-row-L1")).toBeNull();
    expect(screen.getByTestId("lender-row-L3")).toBeTruthy();
  });

  it("send-to-selected calls POST with selected ids", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders/envelope")) return Promise.resolve(readyEnvelope);
      return Promise.resolve([]);
    });
    mockPost.mockResolvedValueOnce({});
    render(<LendersTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("lenders-tab"));
    fireEvent.click(screen.getByTestId("lender-select-L1"));
    fireEvent.click(screen.getByTestId("lender-select-L3"));
    fireEvent.click(screen.getByTestId("send-to-selected"));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const [path, body] = mockPost.mock.calls[0]!;
    expect(path).toContain("/lenders/send");
    expect((body as any).lenderIds.sort()).toEqual(["L1", "L3"].sort());
  });

  it("confirm acceptance posts and removes the row", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders/envelope")) return Promise.resolve(readyEnvelope);
      if (url.includes("/offers")) return Promise.resolve(pending);
      return Promise.resolve([]);
    });
    mockPost.mockResolvedValueOnce({});
    render(<LendersTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("pending-acceptance-banner"));
    fireEvent.click(screen.getByTestId("confirm-acceptance-OFFER1"));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith(
      "/api/offers/OFFER1/confirm-acceptance", {}
    ));
  });
});

// BF_PORTAL_BLOCK_v181_LENDERS_TAB_GATING_TESTS_v1
describe("LendersTab gating states", () => {
  it("renders locked panel with outstanding docs when status is locked", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders/envelope")) return Promise.resolve({
        status: "locked",
        outstanding: ["Bank Statement", "P&L Statement"],
        computed_at: null,
        matches: [],
      });
      return Promise.resolve([]);
    });
    render(<LendersTab applicationId="app-locked" />);
    await waitFor(() => screen.getByTestId("lenders-locked"));
    expect(screen.getByText(/Lender matching is locked/i)).toBeTruthy();
    expect(screen.getByText("Bank Statement")).toBeTruthy();
    expect(screen.getByText("P&L Statement")).toBeTruthy();
    expect(screen.queryByTestId("lenders-tab")).toBeNull();
  });

  it("renders stale banner + Recalculate button when status is stale", async () => {
    const computedAt = new Date("2026-05-01T10:00:00Z").toISOString();
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders/envelope")) return Promise.resolve({
        status: "stale",
        outstanding: [],
        computed_at: computedAt,
        matches: lenders,
      });
      return Promise.resolve([]);
    });
    render(<LendersTab applicationId="app-stale" />);
    await waitFor(() => screen.getByText(/Matches are stale/i));
    expect(screen.getByRole("button", { name: /Recalculate/i })).toBeTruthy();
    expect(screen.getByTestId("lender-row-L1")).toBeTruthy();
  });

  it("clicking Recalculate POSTs to /lenders/recalculate with the application id", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders/envelope")) return Promise.resolve({
        status: "stale",
        outstanding: [],
        computed_at: new Date().toISOString(),
        matches: [],
      });
      return Promise.resolve([]);
    });
    mockPost.mockResolvedValueOnce({
      status: "ready",
      outstanding: [],
      computed_at: new Date().toISOString(),
      matches: [],
    });
    render(<LendersTab applicationId="app-recalc" />);
    const btn = await waitFor(() => screen.getByRole("button", { name: /Recalculate/i }));
    fireEvent.click(btn);
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const [path] = mockPost.mock.calls[0]!;
    expect(path).toContain("/applications/app-recalc/lenders/recalculate");
  });
});
