import { describe, expect, it } from "vitest";
import { assertApiResponse } from "@/lib/assertApiResponse";

describe("API contract break", () => {
  it("throws on invalid JSON payload", () => {
    expect(() => assertApiResponse("invalid-json")).toThrow("API_CONTRACT_VIOLATION");
  });

  it("throws on missing status", () => {
    expect(() => assertApiResponse({ data: {} })).toThrow("API_CONTRACT_VIOLATION");
  });

  it("throws when API status is error", () => {
    expect(() => assertApiResponse({ status: "error", error: "NOPE" })).toThrow("NOPE");
  });

  it("accepts valid success payload", () => {
    expect(assertApiResponse<{ id: string }>({ status: "ok", data: { id: "1" } })).toEqual({ id: "1" });
  });
});
