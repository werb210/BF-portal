// BF_PORTAL_v72_BLOCK_2_6
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

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockUpload.mockReset();
});

describe("LendersTab", () => {
  it("renders rows with badges and pending banner", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/lenders")) return Promise.resolve(lenders);
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
      if (url.includes("/lenders")) return Promise.resolve(lenders);
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
      if (url.includes("/lenders")) return Promise.resolve(lenders);
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
      if (url.includes("/lenders")) return Promise.resolve(lenders);
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
