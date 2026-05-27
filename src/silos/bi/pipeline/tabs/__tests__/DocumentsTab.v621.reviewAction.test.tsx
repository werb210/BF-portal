import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

    expect(JSON.stringify(biApiMock.mock.calls[0][1])).not.toContain('"decision":"accepted"');

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

  it("contains v621 marker in DocumentsTab source", () => {
    const sourcePath = path.resolve(process.cwd(), "src/silos/bi/pipeline/tabs/DocumentsTab.tsx");
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("BF_PORTAL_BLOCK_v621_BI_DOC_REVIEW_ACTION_KEY_v1");
  });
});
