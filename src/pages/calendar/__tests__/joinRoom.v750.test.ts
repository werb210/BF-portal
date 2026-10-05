// BF_PORTAL_JOIN_ROOM_v750
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { roomSlugFromEvent, phoneFromEvent } from "../eventPhone";

const notes = "Test Monday, October 5, 2026 at 2:30 p.m. (Alberta time) Join by phone: call (866) 631-8939, press 3, then enter access code 799151 and press #. Meeting page: https://server.boreal.financial/api/meetings/join/2367a2ac98b1 One tap from a mobile: +18666318939,,3,,,799151#";

describe("Join room on a conference event", () => {
  it("finds the room from the meeting link in the event", () => {
    expect(roomSlugFromEvent(notes)).toBe("2367a2ac98b1");
    expect(roomSlugFromEvent("Phone call - Boreal calls 5878881837")).toBeNull();
  });
  it("a room event still offers no Call button for Boreal's own 866 line", () => {
    expect(phoneFromEvent("Phone (866) 631-8939, press 3, code 799151", notes)).toBeNull();
  });
  it("the popup shows Join room and joins through the dialler", () => {
    const page = readFileSync("src/pages/calendar/CalendarPage.tsx", "utf8");
    expect(page).toContain('data-testid="calendar-event-join-room"');
    expect(page).toContain("void joinMeetingRoom(slug, selectedEvent.title)");
    expect(readFileSync("src/dialer/actions.ts", "utf8")).toContain("st.device!.connect({params:{meetingSlug: slug}})");
  });
});
