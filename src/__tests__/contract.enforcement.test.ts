import { describe, expect, it } from "vitest";
import { api } from "../api";

describe("API contract enforcement", () => {
  it("rejects invalid shapes", async () => {
    await expect(
      api("/invalid-endpoint")
    ).rejects.toThrow();
  });
});
