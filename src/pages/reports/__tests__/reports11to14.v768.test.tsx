// BF_PORTAL_REPORTS11_14_v768
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/api", () => ({ api: { put: vi.fn(), post: vi.fn(), get: vi.fn() } }));
import { renderReport } from "../ReportDataCards";

describe("reports 11-14 cards", () => {
  it("email performance", () => {
    render(<div>{renderReport("email_performance", { days: 30, note: "n", staff: [{ label: "Todd", sent: 12, opened: 7 }], sequences: [{ label: "Welcome", sent: 40, opened: 20, clicked: 5 }], templates: [] })}</div>);
    expect(screen.getByText("Todd")).toBeTruthy(); expect(screen.getByText("Welcome")).toBeTruthy();
  });
  it("SMS campaigns", () => {
    render(<div>{renderReport("sms_campaign_performance", { days: 90, note: "n", campaigns: [{ label: "Oct promo", sent: 100, delivered: 95, failed: 5, clicked: 9, replied: 4, opted_out: 2 }], sequences: [] })}</div>);
    expect(screen.getByText("Oct promo")).toBeTruthy();
  });
  it("website pages and devices", () => {
    render(<div>{renderReport("website_pages", { days: 30, note: "n", pages: [{ label: "/equipment-financing", visits: 50, applications: 3 }], devices: [{ label: "Phone", visits: 30, applications: 1 }] })}</div>);
    expect(screen.getByText("/equipment-financing")).toBeTruthy(); expect(screen.getByText("Phone")).toBeTruthy();
  });
  it("lifecycle", () => {
    render(<div>{renderReport("lifecycle", { days: 365, stages: [{ label: "Funded", count: 4, median_days_to_next: null }, { label: "Started an application", count: 20, median_days_to_next: 6.5 }] })}</div>);
    expect(screen.getByText("Funded")).toBeTruthy(); expect(screen.getByText("6.5 d")).toBeTruthy();
  });
});
