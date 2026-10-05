// BF_PORTAL_CALENDAR_CALL_v745 / BF_PORTAL_MEETING_CONFERENCE_v745
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { phoneFromEvent, prettyPhone } from "../eventPhone";
import { roomMinutes } from "@/components/crm/popups/MeetingPopup";

describe("calendar event Call button", () => {
  it("finds the number in a booked call's location or notes", () => {
    expect(phoneFromEvent("Phone call - Boreal calls 5875551234", null)).toBe("+15875551234");
    expect(phoneFromEvent(null, "We will call you at (403) 555-0199. Notes: hi")).toBe("+14035550199");
    expect(phoneFromEvent("Phone call: +1 780-555-0100")).toBe("+17805550100");
  });
  it("never offers Boreal's own line, dates or short numbers", () => {
    expect(phoneFromEvent("Callers dial (866) 631-8939, press 3")).toBeNull();
    expect(phoneFromEvent("10/5/2026, 9:00:00 AM", "code 123456")).toBeNull();
    expect(phoneFromEvent("Microsoft Teams")).toBeNull();
  });
  it("shows the number readably and calls through the dialler", () => {
    expect(prettyPhone("+15875551234")).toBe("(587) 555-1234");
    const page = readFileSync("src/pages/calendar/CalendarPage.tsx", "utf8");
    expect(page).toContain('data-testid="calendar-event-call"');
    expect(page).toContain("startOutboundPstn(callTo,");
  });
});

describe("Meeting form conference option", () => {
  it("offers a conference room beside Teams, phone and in person", () => {
    const f = readFileSync("src/components/crm/popups/MeetingPopup.tsx", "utf8");
    expect(f).toContain('<option value="conference">Conference call (dial-in code, up to 10 people)</option>');
    expect(f).toContain('api.post<{ meeting: { code: string }; refused?: number; delivery?: MeetingDelivery }>("/api/meetings"');
    expect(readFileSync("src/components/crm/ActionBar.tsx", "utf8")).toContain("defaultName={contactName}");
  });
  it("turns the start and end into a room length of 15 to 240 minutes", () => {
    expect(roomMinutes("2026-10-06T15:00:00Z", "2026-10-06T16:30:00Z")).toBe(90);
    expect(roomMinutes("2026-10-06T15:00:00Z", "2026-10-06T15:05:00Z")).toBe(15);
    expect(roomMinutes("2026-10-06T15:00:00Z", "2026-10-07T15:00:00Z")).toBe(240);
  });
});
