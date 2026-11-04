// BF_PORTAL_v890_MAYA_LENDER_UPDATES - Maya's suggested lender changes: shown per meeting, saved only on Approve.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const apiGet = vi.fn();
const apiPatch = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => apiGet(...a), patch: (...a: unknown[]) => apiPatch(...a) } }));

import MayaLenderSuggestions, { formatSuggestionValue } from "../MayaLenderSuggestions";

const LENDER = "11111111-1111-4111-8111-111111111111";
const MEETING = "22222222-2222-4222-8222-222222222222";

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => { apiGet.mockReset(); apiPatch.mockReset(); });

describe("MayaLenderSuggestions", () => {
  it("formats values by field", () => {
    expect(formatSuggestionValue("amount_max", 500000)).toBe("$500,000");
    expect(formatSuggestionValue("commission", 2.5)).toBe("2.5%");
    expect(formatSuggestionValue("term_max", 36)).toBe("36 months");
    expect(formatSuggestionValue("amount_min", null)).toBe("blank");
  });

  it("shows nothing when there are no suggestions", async () => {
    apiGet.mockResolvedValue({ meetings: [] });
    const { container } = render(wrap(<MayaLenderSuggestions lenderId={LENDER} />));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith(`/api/lender-updates/lenders/${LENDER}`));
    expect(container.textContent).toBe("");
  });

  it("lists a suggestion and approves it", async () => {
    apiGet.mockResolvedValue({ meetings: [{ meeting_id: MEETING, subject: "Quarterly check-in", meeting_at: "2026-11-02T17:00:00Z", updates: [
      { id: "u1", target: "product", product_id: "p1", product_name: "Sample LOC", field: "amount_max", label: "Maximum amount", current: 250000, proposed: 500000, reason: "They now go to $500k.", status: "proposed" },
    ] }] });
    apiPatch.mockResolvedValue({ update: { id: "u1", status: "approved" } });
    render(wrap(<MayaLenderSuggestions lenderId={LENDER} />));
    expect(await screen.findByText("Changes Maya heard in meetings")).toBeTruthy();
    expect(screen.getByText("$250,000 → $500,000")).toBeTruthy();
    expect(screen.getByText("They now go to $500k.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith(`/api/lender-updates/${MEETING}/u1`, { decision: "approve" }));
  });
});
