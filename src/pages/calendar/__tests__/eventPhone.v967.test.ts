// BF_PORTAL_v967_CALL_DIAL_IN
import { describe, expect, it } from "vitest";
import { conferenceIdFromEvent, phoneFromEvent } from "../eventPhone";

const TEAMS = "Microsoft Teams meeting Join: https://teams.microsoft.com/meet/2119064536994901?p=daNT12ISEbyKvgAHk5 Meeting ID: 211 906 453 699 490 1 Passcode: 7Ay9B8H9 Need help? | System reference Dial in by phone +1 647-749-7103,,303016444# Canada, Toronto Find a local number Phone conference ID: 303 016 444# For organizers: Meeting options | Reset dial-in PIN";

describe("the number a calendar event's Call button dials", () => {
  it("a Teams invite gives the dial-in number, never digits out of the meeting id or link", () => {
    expect(phoneFromEvent("Microsoft Teams Meeting", TEAMS)).toBe("+16477497103");
    expect(conferenceIdFromEvent(TEAMS)).toBe("303 016 444#");
  });
  it("ordinary booked calls still work, and a long digit run is not a phone number", () => {
    expect(phoneFromEvent("Phone call - Boreal calls 5875551234")).toBe("+15875551234");
    expect(phoneFromEvent("We will call you at (587) 555-0142.")).toBe("+15875550142");
    expect(phoneFromEvent("ref 28010230291828703")).toBeNull();
    expect(phoneFromEvent("Call (866) 631-8939")).toBeNull();
    expect(conferenceIdFromEvent("no conference here")).toBeNull();
  });
});
