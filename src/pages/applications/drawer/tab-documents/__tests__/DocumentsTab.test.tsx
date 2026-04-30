// BF_PORTAL_v70_BLOCK_2_4
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("@/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import DocumentsTab from "../DocumentsTab";

const sample = {
  categories: [
    {
      key: "bank_statements",
      label: "Bank Statements",
      required: true,
      files: [
        { id: "f1", filename: "jan.pdf", uploadedAt: "2026-01-15", size: 12345, status: "pending_review", url: "https://x" },
      ],
    },
    {
      key: "tax_returns",
      label: "Tax Returns",
      required: true,
      files: [],
    },
    {
      key: "extras",
      label: "Other PDFs",
      required: false,
      files: [
        { id: "f2", filename: "misc.pdf", uploadedAt: "2026-02-01", size: 999, status: "accepted" },
      ],
    },
  ],
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe("DocumentsTab", () => {
  it("renders categories and shows blocked callout when required is missing", async () => {
    mockGet.mockResolvedValueOnce(sample);
    render(<DocumentsTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("documents-tab"));
    expect(screen.getByTestId("doc-cat-bank_statements")).toBeTruthy();
    expect(screen.getByTestId("doc-cat-tax_returns")).toBeTruthy();
    expect(screen.getByTestId("docs-blocked-callout")).toBeTruthy();
  });

  it("filters to Other when toggled", async () => {
    mockGet.mockResolvedValueOnce(sample);
    render(<DocumentsTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("documents-tab"));
    fireEvent.click(screen.getByTestId("docs-filter-other"));
    expect(screen.getByTestId("doc-cat-extras")).toBeTruthy();
    expect(screen.queryByTestId("doc-cat-bank_statements")).toBeNull();
  });

  it("accepting a file calls POST and updates status pill", async () => {
    mockGet.mockResolvedValueOnce(sample);
    mockPost.mockResolvedValueOnce({});
    render(<DocumentsTab applicationId="app-1" />);
    await waitFor(() => screen.getByTestId("documents-tab"));
    fireEvent.click(screen.getByTestId("doc-cat-bank_statements").querySelector("button") as HTMLButtonElement);
    fireEvent.click(screen.getByTestId("doc-actions-f1"));
    fireEvent.click(screen.getByTestId("doc-accept-f1"));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/api/documents/f1/accept", {}));
  });
});
