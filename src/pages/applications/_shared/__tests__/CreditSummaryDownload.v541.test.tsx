// BF_PORTAL_BLOCK_v541_CREDIT_SUMMARY_DOWNLOAD
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

const paths: string[] = [];
vi.mock("@/api", () => ({
  rawApiFetch: vi.fn(async (path: string) => {
    paths.push(path);
    if (path.includes("/export.")) return { ok: true, status: 200, headers: new Headers({ "content-disposition": 'attachment; filename="Credit Summary - A&W Farms.docx"' }), blob: async () => new Blob(["x"]) };
    return { ok: true, status: 200, json: async () => ({ summary: { status: "draft", submitted_by_name: null, submitted_at: null, doc: {
      dealType: "equipment", overview: {}, financials: { periods: [], rows: [] }, equipment: null, receivables: null, sections: [], missing: [], warnings: [], unverifiedResearch: [], generatedAt: "" } } }) };
  }),
}));

import CreditSummaryV2 from "../CreditSummaryV2";

describe("v541 download", () => {
  it("downloads the Word file with the server's file name", async () => {
    (URL as any).createObjectURL = vi.fn(() => "blob:x");
    (URL as any).revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(createElement(CreditSummaryV2, { applicationId: "a1" }));
    fireEvent.click(await screen.findByTestId("cs2-download-docx"));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(paths).toContain("/api/credit-summary-v2/a1/export.docx");
    expect(screen.getByTestId("cs2-download-pdf")).toBeInTheDocument();
  });
});
