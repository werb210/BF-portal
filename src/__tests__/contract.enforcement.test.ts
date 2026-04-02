import { api } from "../lib/api";

describe("API contract enforcement", () => {
  it("rejects invalid shapes", async () => {
    await expect(
      api("/invalid-endpoint")
    ).rejects.toThrow();
  });
});
