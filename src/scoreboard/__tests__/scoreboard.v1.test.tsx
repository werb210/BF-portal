// BF_PORTAL_TV_SCOREBOARD_v1 - the Leaderboard report and Settings > Screens.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, patch: h.patch } }));

import LeaderboardReport from "../LeaderboardReport";
import ScreensSettings from "../ScreensSettings";
import { withPortalReports } from "@/pages/reports/reportLibrary";

const BOARD = {
  period: { month: "2026-11", label: "November 2026", days_left: 5 }, currency: "CAD",
  brokers: [
    { user_id: "u1", name: "Ann Able", initials: "AA", photo_url: null, team_id: "t1", team: "Eagles", volume: 250000, deals: 1, goal: 500000, rank: 1, movement: 2 },
    { user_id: "u2", name: "Bob Baker", initials: "BB", photo_url: null, team_id: "t2", team: "Hawks", volume: 140000, deals: 1, goal: null, rank: 2, movement: -1 },
  ],
  teams: [{ id: "t1", name: "Eagles", volume: 250000, deals: 1, goal: 500000, brokers: 1, rank: 1 }],
  office: { volume: 390000, deals: 2, goal: 500000 }, recent: [],
};

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.patch.mockReset();
  h.get.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/scoreboard/board")) return BOARD;
    if (path === "/api/scoreboard/screens") return { screens: [] };
    if (path === "/api/teams/options") return { teams: [{ id: "t1", name: "Eagles" }] };
    return {};
  });
});

describe("Leaderboard report", () => {
  it("ranks brokers with movement and goal progress", async () => {
    render(<LeaderboardReport />);
    const rows = await screen.findAllByTestId("leaderboard-row");
    expect(rows[0].textContent).toContain("Ann Able");
    expect(rows[0].textContent).toContain("50%");
    expect(screen.getByLabelText("Up 2")).toBeTruthy();
    expect(screen.getByLabelText("Down 1")).toBeTruthy();
    expect(screen.getByTestId("leaderboard-team").textContent).toContain("Eagles");
  });
  it("is in every staff member's report library", () => {
    expect(withPortalReports([], "Staff").some((r) => r.key === "leaderboard")).toBe(true);
  });
});

describe("Settings > Screens", () => {
  it("pairs a TV with the code it shows", async () => {
    h.post.mockResolvedValue({ screen: { id: "s1", name: "Sales floor", team_ids: null, slides: ["leaderboard"], rotate_seconds: 20, created_at: "", last_seen_at: null } });
    render(<ScreensSettings />);
    fireEvent.click(await screen.findByText("Add a TV"));
    fireEvent.change(screen.getByLabelText("Code on the TV"), { target: { value: "ab3k7q" } });
    fireEvent.change(screen.getByLabelText("TV name"), { target: { value: "Sales floor" } });
    fireEvent.click(screen.getByText("Pair TV"));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/scoreboard/screens/pair", expect.objectContaining({ code: "AB3K7Q", name: "Sales floor", team_ids: null })));
    expect(await screen.findByText(/Sales floor is paired/)).toBeTruthy();
  });
});
