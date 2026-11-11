import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin" } }) }));
vi.mock("@/retention/retention", () => ({
  fetchApplicationRetention: vi.fn(async () => ({ documents: {} })),
  refusedDeleteMessage: vi.fn(),
}));
vi.mock("@/components/applications/DocumentSplitView", () => ({ default: () => null }));
vi.mock("@/components/applications/AcceptNameDialog", () => ({ default: () => null }));
vi.mock("@/api", () => ({
  api: {
    get: vi.fn(async (url: string) => url.endsWith("/duplicates") ? [] : ({
      documents: [{
        documentId: "doc-863", filename: "bank-statement.pdf", category: "Other",
        size: 51200, createdAt: "2026-10-27T12:00:00Z", status: "pending",
      }],
    })),
    post: vi.fn(async () => ({
      level: "medium", signals: [{ code: "metadata", label: "Metadata changed", severity: "medium", detail: "Review document metadata." }], note: null,
    })),
  },
}));

import DocumentsTab from "../DocumentsTab";

describe("v863 tamper report under the document row", () => {
  it("opens a full-width report outside the wrapping action column", async () => {
    render(<DocumentsTab applicationId="app-863" />);
    const scan = await screen.findByRole("button", { name: /scan for tampering/i });
    const actions = scan.closest("[data-testid=\"doc-row-menu\"]")!.parentElement!; // v939: Scan is under the ⋯ menu
    const documentRow = actions.parentElement!;
    expect(screen.queryByTestId("doc-fraud-row")).toBeNull();
    fireEvent.click(scan);
    const report = await screen.findByTestId("doc-fraud-row");
    expect(report.parentElement).toBe(documentRow);
    expect(actions.contains(report)).toBe(false);
    expect(actions.nextElementSibling).toBe(report);
    expect(report.style.gridColumn).toBe("1 / -1");
    expect(report.style.minWidth).toBe("0");
    expect(actions.style.flexWrap).toBe("wrap");
    expect(actions.style.justifyContent).toBe("flex-end");
    expect(report.textContent).toContain("Review document metadata.");
    fireEvent.click(screen.getByTestId("doc-fraud-toggle"));
    expect(report.textContent).not.toContain("Review document metadata.");
    expect(screen.getByText("bank-statement.pdf")).toBeTruthy();
  });
});
