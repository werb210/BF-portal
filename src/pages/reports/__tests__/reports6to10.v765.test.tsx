// BF_PORTAL_REPORTS6_10_v765 / BF_PORTAL_MMS_FALLBACK_v765
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const put = vi.fn(async () => ({ ok: true }));
vi.mock("@/api", () => ({ api: { put: (...a: unknown[]) => (put as any)(...a), post: vi.fn(), get: vi.fn() } }));
import { renderReport } from "../ReportDataCards";
import { ThreadImage } from "@/components/messaging/MessageThread";

describe("reports 6-10 cards", () => {
  it("render each report", () => {
    render(<div>{renderReport("pipeline_movement", { days: 30, rows: [{ label: "Funded", files: 2, amount: 150000 }] })}</div>);
    expect(screen.getByText("$150,000")).toBeTruthy();
    render(<div>{renderReport("average_deal_size", { days: 365, byProduct: [{ label: "TERM", files: 3, average: 100000, median: 90000, funded_average: null }], bySource: [] })}</div>);
    expect(screen.getByText("TERM")).toBeTruthy();
    render(<div>{renderReport("meetings", { days: 90, note: "n", rows: [{ label: "Todd", booked: 4, held: 3, cancelled: 1, upcoming: 0, led_to_funded: 1 }] })}</div>);
    expect(screen.getByText("Todd")).toBeTruthy();
    render(<div>{renderReport("tasks_report", { days: 30, rows: [{ label: "Andrew", open: 5, overdue: 2, completed: 7, on_time: 6 }] })}</div>);
    expect(screen.getByText("Andrew")).toBeTruthy();
  });
  it("goals show progress and let an Admin set targets", async () => {
    vi.spyOn(window, "prompt").mockReturnValueOnce("200000").mockReturnValueOnce("4000");
    render(<div>{renderReport("goals", { month: "2026-10", canEdit: true, rows: [{ userId: "u1", name: "Todd", funded: 100000, fundingTarget: 200000, commission: 0, commissionTarget: null }] })}</div>);
    expect(screen.getByText("50%")).toBeTruthy();
    fireEvent.click(screen.getByText("Set goals"));
    await waitFor(() => expect(put).toHaveBeenCalledWith("/api/reports/goals", { userId: "u1", fundingTarget: "200000", commissionTarget: "4000" }));
  });
});

describe("text-message images", () => {
  it("say so when they cannot load instead of showing a broken picture", () => {
    render(<ThreadImage url="https://server/x" name="Image" />);
    fireEvent.error(screen.getByAltText("Image"));
    expect(screen.getByTestId("thread-image-failed").textContent).toContain("couldn't load");
  });
});
