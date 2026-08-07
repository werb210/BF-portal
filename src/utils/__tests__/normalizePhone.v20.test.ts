// BF_PORTAL_PHONE_LEADING_ONE_v20
import { describe, it, expect } from "vitest";
import { normalizePhone, isPlausibleNanpNational, PhoneFormatError } from "../normalizePhone";

describe("normalizePhone", () => {
  it("accepts plain and country-coded input", () => {
    expect(normalizePhone("403 555 0123")).toBe("+14035550123");
    expect(normalizePhone("+1 403 555 0123")).toBe("+14035550123");
  });

  it("rejects the double-prefix case seen in production", () => {
    expect(() => normalizePhone("+1 423-205-619")).toThrow(/missing a digit/i);
    expect(() => normalizePhone("+1 325-400-209")).toThrow(/missing a digit/i);
  });

  it("rejects impossible area or exchange codes", () => {
    expect(() => normalizePhone("911 555 0123")).toThrow(PhoneFormatError);
  });

  it("distinguishes too-short from invalid", () => {
    expect(() => normalizePhone("403 555")).toThrow(/too short/i);
  });
});

describe("isPlausibleNanpNational", () => {
  it("rejects a leading 1 in NPA", () => {
    expect(isPlausibleNanpNational("1423205619")).toBe(false);
  });
  it("accepts a real number", () => {
    expect(isPlausibleNanpNational("8254511768")).toBe(true);
  });
});
