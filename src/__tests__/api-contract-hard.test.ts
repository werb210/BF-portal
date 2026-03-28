import { describe, expect, it } from "vitest";
import { assertApiResponse } from "@/lib/assertApiResponse";

describe("hard API contract enforcement", () => {
  it("rejects malformed API response", async () => {
    await expect(Promise.resolve().then(() => assertApiResponse(null))).rejects.toThrow();
  });

  it("rejects failed API response", async () => {
    await expect(Promise.resolve().then(() => assertApiResponse({ success: false }))).rejects.toThrow();
  });
});
