// BF_PORTAL_BLOCK_v543_ABANDONED_COUNTRY_FILTER
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";

const row = (id: string, country: "CA" | "US" | null, name: string, belowCanadianFloor = false) => ({
  applicationId: id, step: 1, contactId: null, name, phone: "+1", country, email: null, amount: null, product: null,
  source: null, campaign: null, startedAt: "2026-09-20T00:00:00Z", lastActivityAt: "2026-09-24T00:00:00Z", nudgedAt: null, belowCanadianFloor,
});
vi.mock("@/api", () => ({
  api: { get: vi.fn(async () => ({ items: [row("1", "CA", "Canada One"), row("2", "CA", "Canada Two", true), row("3", "US", "US One"), row("4", null, "No Country")] })) },
}));

import AbandonedPanel from "../AbandonedPanel";

describe("v543 country filter", () => {
  it("shows Both by default, then only Canada or only US, with counts that follow", async () => {
    render(createElement(MemoryRouter, null, createElement(AbandonedPanel)));
    expect(await screen.findByText("No Country")).toBeInTheDocument();
    expect(screen.getByText(/Started, not submitted \(4\)/)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("abandoned-country"), { target: { value: "CA" } });
    expect(screen.getByText(/Started, not submitted \(2\)/)).toBeInTheDocument();
    expect(screen.queryByText("US One")).toBeNull();
    expect(screen.queryByText("No Country")).toBeNull();
    expect(screen.getByTestId("abandoned-callable")).toHaveTextContent("1 callable");
    fireEvent.change(screen.getByTestId("abandoned-country"), { target: { value: "US" } });
    expect(screen.getByText("US One")).toBeInTheDocument();
    expect(screen.queryByText("Canada One")).toBeNull();
  });
  it("dashboard labels say what the numbers are", () => {
    const d = fs.readFileSync("src/pages/dashboard/DashboardPage.tsx", "utf8");
    expect(d).toContain("Commission Earned (all time)");
    expect(d).toContain("New CRM Contacts Today");
  });
});
