// BF_PORTAL_v930_MAYA_REPORTS - ask Maya for a report; live Maya tables.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@/api", () => ({ api: { post: h.post, get: h.get } }));
import { AskMayaForReport, MayaTableCard } from "../MayaReports";

afterEach(() => { cleanup(); h.post.mockReset(); h.get.mockReset(); });

describe("Ask Maya for a report", () => {
  it("adds the card Maya built", async () => {
    h.post.mockResolvedValue({ kind: "table", spec: { title: "Applications by product", object: "applications", group_by: "product", measure: "count", days: 90 } });
    const onCard = vi.fn();
    render(<AskMayaForReport silo="BF" onCard={onCard} />);
    fireEvent.change(screen.getByLabelText("Ask Maya for a report"), { target: { value: "applications by product this quarter" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Dashboard" }));
    await waitFor(() => expect(onCard).toHaveBeenCalledWith(expect.objectContaining({ kind: "table" })));
    expect(h.post).toHaveBeenCalledWith("/api/reports/ask", { question: "applications by product this quarter", silo: "BF" });
  });
  it("says so when Maya cannot build it", async () => {
    h.post.mockResolvedValue({ kind: "none", message: "Maya could not build that report." });
    render(<AskMayaForReport silo="BF" onCard={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Ask Maya for a report"), { target: { value: "weather" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Dashboard" }));
    expect(await screen.findByText("Maya could not build that report.")).toBeTruthy();
  });
  it("shows a live table", async () => {
    h.get.mockResolvedValue({ title: "T", columns: ["Product", "Applications"], rows: [{ label: "Equipment", value: 4 }], measure: "count", refreshed_at: "2026-11-09T20:00:00Z" });
    render(<MayaTableCard silo="BF" spec={{ title: "T", object: "applications", group_by: "product", measure: "count", days: null }} />);
    expect(await screen.findByText("Equipment")).toBeTruthy();
    expect(String(h.get.mock.calls[0]![0])).toContain("/api/reports/maya-table?silo=BF&spec=");
  });
});
