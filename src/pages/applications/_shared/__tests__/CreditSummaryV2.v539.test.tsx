// BF_PORTAL_BLOCK_v539_CREDIT_SUMMARY_V2
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
const calls: { path: string; method: string; body?: string }[] = [];
let summary: any = null;
vi.mock("@/api", () => ({ rawApiFetch: vi.fn(async (path: string, opts: any = {}) => {
  calls.push({ path, method: opts.method ?? "GET", body: opts.body });
  if (path.endsWith("/generate")) summary = { status: "draft", submitted_by_name: null, submitted_at: null, doc: DOC };
  if (path.endsWith("/submit")) summary = { ...summary, status: "submitted", submitted_by_name: "Andrew Polturak", submitted_at: "2026-09-26T16:00:00Z" };
  return { ok: true, status: 200, json: async () => ({ summary }) };
}) }));
const DOC = {
  dealType: "abl", generatedAt: "2026-09-26T15:00:00Z",
  overview: { applicant_name: "Pro-Pipe Service & Sales Ltd.", facility_request: "$5,000,000", ltv: "88%", website: "propipecanada.com" },
  financials: { periods: [{ label: "FY2023", kind: "annual" }, { label: "FY2024", kind: "annual" }], rows: [{ item: "revenue", values: [17654361, 11556700] }, { item: "dscr", values: [2.1, 1.8] }] },
  equipment: null, receivables: null,
  sections: [{ key: "transaction", title: "Transaction", text: "Replace the ATB LOC." }, { key: "overview", title: "Overview", text: "Downhole tools." }, { key: "deal_section", title: "Borrowing Base", text: "A/R $2.35MM." }, { key: "financial_commentary", title: "Financial Summary", text: "Stable EBITDA." }, { key: "rationale", title: "Rationale for approval", text: "", bullets: ["Experienced operator"] }, { key: "risks", title: "Risks and mitigants", text: "", risks: [{ risk: "Over-90 A/R", mitigant: "Excluded" }] }],
  missing: ["No bank statements or banking analysis."], warnings: ["Financial Summary: $21.5MM is not in the source figures - check it."],
  unverifiedResearch: [{ id: "7", label: "Incorporated", value: "Alberta 1998", url: "https://registry.example" }],
};
import CreditSummaryV2 from "../CreditSummaryV2";
import { cell, textToBullets, textToRisks } from "../creditSummaryV2Helpers";
beforeEach(() => { calls.length = 0; summary = null; vi.spyOn(window, "confirm").mockReturnValue(true); });
describe("v539 helpers", () => {
  it("formats money and ratios", () => { expect(cell("revenue", 11556700)).toBe("$11,556,700"); expect(cell("dscr", 1.8)).toBe("1.80x"); expect(cell("net_income", -12500)).toBe("($12,500)"); });
  it("parses edited text", () => { expect(textToBullets("- Good collateral\n\n• Experienced operator")).toEqual(["Good collateral", "Experienced operator"]); expect(textToRisks("Over-90 A/R | Excluded from base\nConcentration")).toEqual([{ risk: "Over-90 A/R", mitigant: "Excluded from base" }, { risk: "Concentration", mitigant: "" }]); });
});
describe("v539 credit summary screen", () => {
  it("generates, confirms, edits and submits", async () => {
    render(<CreditSummaryV2 applicationId="a1" />); fireEvent.click(await screen.findByTestId("cs2-generate"));
    expect(await screen.findByText("Pro-Pipe Service & Sales Ltd.")).toBeInTheDocument(); expect(screen.getByTestId("cs2-financials")).toHaveTextContent("1.80x");
    fireEvent.click(screen.getByText("Confirm")); await waitFor(() => expect(calls.some((call) => call.path === "/api/credit-research/a1/facts/7" && call.body === JSON.stringify({ status: "confirmed" }))).toBe(true));
    const overview = screen.getByTestId("cs2-section-overview"); fireEvent.click(overview.querySelector("button")!); fireEvent.change(screen.getByLabelText("Overview text"), { target: { value: "Founded in 1998." } }); fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/sections/overview"))).toBe(true)); fireEvent.click(screen.getByTestId("cs2-submit")); expect(await screen.findByText(/Submitted by Andrew Polturak/)).toBeInTheDocument();
  });
  it("keeps both screen versions reachable", () => { const tab = fs.readFileSync("src/pages/applications/tabs/CreditSummaryTab.tsx", "utf8"); expect(tab).toContain("CreditSummaryV2"); expect(tab).toContain("CreditSummaryEditor"); });
});
