import { describe, expect, it } from "vitest";
import { assertApiResponse } from "@/lib/assertApiResponse";

describe("API contract break", () => {
  it("throws on invalid JSON payload", () => {
    expect(() => assertApiResponse("invalid-json")).toThrow("INVALID_RESPONSE");
  });

  it("throws on missing success", () => {
    expect(() => assertApiResponse({ data: {} })).toThrow("API_FAILURE");
  });

  it("throws when success is false", () => {
    expect(() => assertApiResponse({ success: false, data: {} })).toThrow("API_FAILURE");
  });

  it("throws on missing data", () => {
    expect(() => assertApiResponse({ success: true })).toThrow("MISSING_DATA");
  });
});
