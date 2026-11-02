// BF_PORTAL_v867_BROKER_TOOLS_SCORECARDS - the Deal desk scorecard and the band text staff type.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put }, rawApiFetch: vi.fn() }));

import ScorecardPanel from "../ScorecardPanel";
import { bandsText, parseBands } from "../scorecardView";

beforeEach(() => { for (const f of Object.values(h)) f.mockReset(); });

describe("credit scorecard", () => {
  it("writes and reads bands", () => {
    const bands = [{ min: null, max: 1, points: 10 }, { min: 1, max: 2, points: 40 }, { min: 5, max: null, points: 100 }];
    expect(bandsText(bands)).toBe("-1:10, 1-2:40, 5-:100");
    expect(parseBands("-1:10, 1-2:40, 5-:100")).toEqual(bands);
    expect(parseBands("one to two: 40")).toBeNull();
  });

  it("scores the deal and shows grade, rule hits and lender fit", async () => {
    h.get.mockResolvedValue({ result: null });
    h.post.mockResolvedValue({ result: { score: 72.5, grade: "B", outcome: "refer", coverage: 85, computed_at: "2026-11-01T12:00:00Z",
      factors: [{ key: "nsf_per_month", label: "NSFs per month", value: 3, weight: 15, points: 25 }],
      hits: [{ id: "r1", outcome: "refer", message: "More than 2 NSFs a month." }], missing: ["Credit score (lowest principal)"],
      lenders: [{ lender_product_id: "p1", lender_name: "Stride", product_name: "Equipment", fit: 80, reasons: ["Amount fits."], concerns: [] }] } });
    render(<ScorecardPanel applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Score this deal" }));
    await waitFor(() => expect(screen.getByTestId("scorecard-summary").textContent).toContain("Score 72.5 / 100"));
    expect(screen.getByText("More than 2 NSFs a month.")).toBeTruthy();
    expect(screen.getByTestId("lender-fit").textContent).toContain("Stride");
    expect(h.post).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/scorecard");
  });
});
