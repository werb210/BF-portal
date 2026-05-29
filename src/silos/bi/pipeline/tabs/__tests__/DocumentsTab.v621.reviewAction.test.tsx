// BF_PORTAL_BLOCK_v635_HOTFIX_v621_NODE_API_v1
// Behavioral test using @testing-library/react. Replaces the v621
// source-grep it() block which imported node:fs / node:path and called
// process.cwd() — those fail tsc --noEmit on BF-portal because the main
// tsconfig (a) doesn't include "node" in its types array and (b) excludes
// *.test.ts but NOT *.test.tsx, so .tsx tests get prod-typechecked.
// The behavioral it() below already proves v621 is in place; the marker
// it() is dropped as redundant. Also guards mock.calls[0] with a non-null
// assertion (TS2532) — the prior waitFor already proved it exists.
// Pattern matches v629 / v633.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));
import DocumentsTab from "../DocumentsTab";

const apiMock = vi.fn();
const biApiMock = vi.fn();
const fetchRequiredDocsMock = vi.fn();

vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
  apiForSilo: () => ((...args: unknown[]) => biApiMock(...args)),
}));

vi.mock("@/silos/bi/api/biRequiredDocs", () => ({
  fetchRequiredDocs: (...args: unknown[]) => fetchRequiredDocsMock(...args),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BF_PORTAL_BLOCK_v621_BI_DOC_REVIEW_ACTION_KEY_v1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchRequiredDocsMock.mockResolvedValue([
      {
        doc_type: "bank_statement",
        display_label: "Bank statement",
        sort_order: 1,
        if_startup: false,
      },
    ]);

    apiMock.mockResolvedValue({
      documents: [
        {
          id: "doc-1",
          doc_type: "bank_statement",
          file_name: "statement.pdf",
          status: "pending",
        },
      ],
    });

    biApiMock.mockResolvedValue({ ok: true });
  });

  it("posts action key for accept and reject review decisions", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("test");

    render(
      <DocumentsTab
        applicationId="app-1"
        stage="document_review"
        onMutated={() => {}}
      />,
    );

    const acceptButton = await screen.findByRole("button", { name: "Accept" });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(biApiMock).toHaveBeenCalledWith(
        "/api/v1/bi/applications/app-1/documents/doc-1/review",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "accepted", reason: null }),
        }),
      );
    });

    expect(JSON.stringify(biApiMock.mock.calls[0]![1])).not.toContain(
      '"decision":"accepted"',
    );

    const rejectButton = screen.getByRole("button", { name: "Reject" });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(biApiMock).toHaveBeenCalledWith(
        "/api/v1/bi/applications/app-1/documents/doc-1/review",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "rejected", reason: "test" }),
        }),
      );
    });

    expect(promptSpy).toHaveBeenCalledWith("Reason for rejecting statement.pdf?");
  });
});
