// BF_PORTAL_MEETING_ROOMS_v736
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const get = vi.fn(); const post = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: any[]) => get(...a), post: (...a: any[]) => post(...a) } }));
import MeetingRoomsPanel from "../MeetingRoomsPanel";
const m = { id: "m1", code: "482913", title: "Desklinx review", starts_at: "2026-10-06T16:00:00Z", duration_min: 60, joinUrl: "https://server.boreal.financial/api/meetings/join/abc", oneTap: "+18666318939,,3,,,482913#", invite: "invite text", open: false };
beforeEach(() => { get.mockReset(); post.mockReset(); get.mockResolvedValue({ meetings: [m] }); post.mockResolvedValue({ meeting: m }); });
describe("Conference rooms panel", () => {
  it("lists meetings with their code, meeting page and one-tap join", async () => {
    render(<MeetingRoomsPanel />);
    expect(await screen.findByText("Desklinx review")).toBeTruthy();
    expect(screen.getByText("482913")).toBeTruthy();
    expect(screen.getByText("Join by phone").getAttribute("href")).toBe("tel:+18666318939,,3,,,482913#");
  });
  it("creates a meeting", async () => {
    render(<MeetingRoomsPanel />);
    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Lender call" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "2026-10-06T10:00" } });
    fireEvent.click(screen.getByText("Create meeting"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/meetings", expect.objectContaining({ title: "Lender call", durationMin: 60 })));
    expect(await screen.findByText(/Access code 482913/)).toBeTruthy();
  });
});
