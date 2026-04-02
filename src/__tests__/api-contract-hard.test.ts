import { describe, expect, it } from "vitest";
import { assertApiResponse } from "@/lib/assertApiResponse";

describe("hard API contract enforcement", () => {
  it("rejects malformed API response", async () => {
    await expect(Promise.resolve().then(() => assertApiResponse(null))).rejects.toThrow("API_CONTRACT_VIOLATION");
  });

  it("rejects failed API response", async () => {
    await expect(Promise.resolve().then(() => assertApiResponse({ status: "error", error: "FAILED" }))).rejects.toThrow("FAILED");
  });
});
