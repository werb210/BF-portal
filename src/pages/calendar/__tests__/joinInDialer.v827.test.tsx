// BF_PORTAL_v827_JOIN_IN_DIALER - staff join a conference room from the portal's dialler, no cell phone needed.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ join: vi.fn(async () => undefined), get: vi.fn() }));
vi.mock("@/dialer/actions", () => ({ joinMeetingRoom: h.join }));
vi.mock("@/api", () => ({ api: Object.assign(vi.fn(), { get: h.get, post: vi.fn(), delete: vi.fn() }) }));

import MeetingRoomsPanel, { meetingSlug } from "../MeetingRoomsPanel";

describe("join a meeting room in the dialer", () => {
  it("reads the room from its meeting link", () => {
    expect(meetingSlug("https://server.boreal.financial/api/meetings/join/ad075f314eeb")).toBe("ad075f314eeb");
    expect(meetingSlug("https://server.boreal.financial/api/meetings/join/ad075f314eeb/")).toBe("ad075f314eeb");
  });

  it("joins the room from the portal dialer", async () => {
    h.get.mockResolvedValue({ meetings: [{ id: "m1", code: "957630", title: "test", starts_at: "2026-10-19T19:09:00Z", duration_min: 30,
      joinUrl: "https://server.boreal.financial/api/meetings/join/ad075f314eeb", oneTap: "+18666318939,3957630#", invite: "x", open: true }] });
    render(<MeetingRoomsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Join in dialer" }));
    await waitFor(() => expect(h.join).toHaveBeenCalledWith("ad075f314eeb", "test"));
  });
});
