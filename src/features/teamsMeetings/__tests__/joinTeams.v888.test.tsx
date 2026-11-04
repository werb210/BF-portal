// BF_PORTAL_v888_TEAMS_IN_APP - staff join Boreal Teams meetings inside the portal (web and iPad).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const JOIN = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_test%40thread.v2/0";
const h = vi.hoisted(() => ({ call: vi.fn(), silos: [] as string[] }));
vi.mock("@/api", () => ({
  apiForSilo: (silo: string) => { h.silos.push(silo); return h.call; },
}));
vi.mock("../TeamsMeetingCall", () => ({
  default: ({ ticket }: { ticket: { displayName: string; joinUrl: string } }) => <div data-testid="acs-call">{ticket.displayName} in {ticket.joinUrl}</div>,
}));

import { JoinTeamsButton } from "../JoinTeamsButton";
import { requestMeetingTicket, isTeamsJoinUrl } from "../teamsMeetingApi";

beforeEach(() => { h.call.mockReset(); h.silos.length = 0; });

describe("join a Teams meeting in the portal", () => {
  it("only Teams links get a Join button", () => {
    expect(isTeamsJoinUrl(JOIN)).toBe(true);
    expect(isTeamsJoinUrl("https://example.test/meet")).toBe(false);
    const { container } = render(<JoinTeamsButton joinUrl="https://example.test/meet" />);
    expect(container.textContent).toBe("");
  });

  it("asks BF-Server for a token for this meeting and opens the call in the portal", async () => {
    h.call.mockResolvedValue({ token: "t", expiresOn: "2030-01-01T00:00:00Z", acsUserId: "8:acs:x", displayName: "Alex Tester (Boreal Financial)", joinUrl: JOIN, subject: "Lender review", startsAt: null });
    render(<JoinTeamsButton joinUrl={JOIN} calendarEventId="AAMk-test" title="Lender review" />);
    expect(screen.getByTestId("join-teams-open-teams")).toHaveAttribute("href", JOIN);
    fireEvent.click(screen.getByTestId("join-teams-in-app"));
    expect(await screen.findByTestId("acs-call")).toHaveTextContent("Alex Tester (Boreal Financial) in " + JOIN);
    expect(h.silos).toEqual(["BF"]);
    expect(h.call).toHaveBeenCalledWith("/api/meetings/acs-token", { method: "POST", body: { joinUrl: JOIN, calendarEventId: "AAMk-test" } });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByTestId("teams-meeting-overlay")).toBeNull());
  });

  it("when in-app video is off, says so and offers Open in Teams", async () => {
    h.call.mockRejectedValue(Object.assign(new Error("x"), { status: 503, details: { error: "video_not_configured", message: "Joining in the app isn't switched on yet. Use Open in Teams instead.", joinUrl: JOIN } }));
    render(<JoinTeamsButton joinUrl={JOIN} />);
    fireEvent.click(screen.getByTestId("join-teams-in-app"));
    const err = await screen.findByTestId("teams-meeting-error");
    expect(err).toHaveTextContent("isn't switched on yet");
    expect(err.querySelector("a")).toHaveAttribute("href", JOIN);
  });

  it("a server answer without a token is treated as a failure", async () => {
    h.call.mockResolvedValue({});
    const r = await requestMeetingTicket({ joinUrl: JOIN, meetingId: "m-1" });
    expect(r.ok).toBe(false);
    expect(h.call).toHaveBeenCalledWith("/api/meetings/acs-token", { method: "POST", body: { joinUrl: JOIN, meetingId: "m-1" } });
  });
});
