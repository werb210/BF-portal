import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import FinancialsTab from "@/pages/applications/tabs/FinancialsTab";

const getMock = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...args: unknown[]) => getMock(...args) } }));

describe("FinancialsTab Block 114", () => {
  beforeEach(() => getMock.mockReset());

  it("enforces document cell maxWidth 260 after render", async () => {
    getMock.mockResolvedValue({
      documents: [{ documentId: "d1", category: "financial", filename: "pnl.pdf", status: "pending", ocrStatus: "completed", uploadedAt: "2026-01-01T00:00:00Z" }],
      fields: [{ documentId: "d1", sourceDocumentType: null, fieldKey: "cash", displayLabel: "Cash on hand", value: "$1,000", confidence: 0.9 }],
    });
    render(<FinancialsTab applicationId="app1" />);
    await waitFor(() => screen.getByText("pnl.pdf"));
    const dataCell = screen.getByText("$1,000").closest("td")!;
    expect(dataCell.style.maxWidth).toBe("260px");
    expect(dataCell.style.width).toBe("240px");
  });

  it("sanitizes long OCR text for numeric fields", async () => {
    const noisy = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
    getMock.mockResolvedValue({
      documents: [{ documentId: "d1", category: "financial", filename: "tax.pdf", status: "pending", ocrStatus: "completed", uploadedAt: "2026-01-01T00:00:00Z" }],
      fields: [{ documentId: "d1", sourceDocumentType: null, fieldKey: "dep", displayLabel: "Depreciation and amortization", value: noisy, confidence: 0.8 }],
    });
    render(<FinancialsTab applicationId="app1" />);
    await waitFor(() => screen.getByText("OCR uncertain"));
    expect(screen.getByTitle(noisy)).toHaveTextContent("—");
  });
});
