import { describe, expect, it } from "vitest";
import { assertApiResponse } from "@/lib/assertApiResponse";

describe("API contract break", () => {
  it("crashes on malformed API response", () => {
    expect(() => assertApiResponse({})).toThrow();
  });
});
