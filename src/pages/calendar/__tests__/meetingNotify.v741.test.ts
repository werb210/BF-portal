// BF_PORTAL_MEETING_NOTIFY_v741
import { describe, expect, it } from "vitest";
import { describeMeetingDelivery } from "../MeetingRoomsPanel";

describe("conference room delivery wording", () => {
  it("names the Outlook event, invitations and texts", () => {
    const r = describeMeetingDelivery({ calendar: "created", calendarError: null, emailed: 2, texted: 3, errors: [] });
    expect(r).toEqual({ ok: true, text: "Added to your Outlook calendar and calendar invitations sent to 2 people, texted 3 people." });
  });
  it("shows failures in plain words", () => {
    const r = describeMeetingDelivery({ calendar: "failed", calendarError: "x", emailed: 1, texted: 0, errors: ["calendar: Outlook refused the event (403)", "text to you: no mobile number on your staff profile"] });
    expect(r.ok).toBe(false);
    expect(r.text).toContain("Invite emailed to 1 person.");
    expect(r.text).toContain("no mobile number on your staff profile");
  });
  it("says when nothing went out", () => {
    expect(describeMeetingDelivery({ calendar: "skipped", calendarError: null, emailed: 0, texted: 0, errors: [] }).text).toBe("Nothing was sent.");
  });
});
