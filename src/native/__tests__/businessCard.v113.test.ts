// BF_PORTAL_BLOCK_v113_IPAD_PENCIL_QUICKLOOK_CARDSCAN
import { describe, expect, it } from "vitest";
import { normalizePhone, parseBusinessCard, splitName } from "@/native/businessCard";

describe("normalizePhone", () => {
  it("formats a bare 10-digit number", () => expect(normalizePhone("4035551234")).toBe("(403) 555-1234"));
  it("formats an 11-digit number with country code", () => expect(normalizePhone("1 403 555 1234")).toBe("+1 (403) 555-1234"));
  it("leaves an international number alone", () => expect(normalizePhone("+44 20 7946 0958")).toBe("+44 20 7946 0958"));
});

describe("splitName", () => {
  it("splits first and last", () => expect(splitName("Todd Werboweski")).toEqual({ firstName: "Todd", lastName: "Werboweski" }));
  it("keeps compound surnames intact", () => expect(splitName("Ana Maria de Souza").lastName).toBe("Maria de Souza"));
});

describe("parseBusinessCard", () => {
  const lines = ["Boreal Financial Group Ltd.", "Todd Werboweski", "Managing Director", "todd.w@boreal.financial", "(403) 555-1234", "boreal.financial"];
  it("extracts every field", () => expect(parseBusinessCard(lines)).toMatchObject({
    email: "todd.w@boreal.financial", phone: "(403) 555-1234", title: "Managing Director",
    company: "Boreal Financial Group Ltd.", website: "boreal.financial",
  }));
  it("does not mistake company for name", () => expect(parseBusinessCard(lines)).toMatchObject({ fullName: "Todd Werboweski", firstName: "Todd", lastName: "Werboweski" }));
  it("lowercases email", () => expect(parseBusinessCard(["Todd.W@Boreal.Financial"]).email).toBe("todd.w@boreal.financial"));
  it("ignores short digit runs", () => expect(parseBusinessCard(["Suite 400", "Jane Doe"]).phone).toBeUndefined());
  it("handles empty input", () => {
    expect(parseBusinessCard([])).toEqual({});
    expect(parseBusinessCard(["", "   "])).toEqual({});
  });
});
