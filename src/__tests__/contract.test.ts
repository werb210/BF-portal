import { describe, expect, it } from "vitest";
import { ApiResponseSchema } from "@boreal/shared-contract";

describe("response contract stays valid", () => {
  it("accepts sample success contract", () => {
    const sample = {
      status: "ok",
      data: {},
    };

    expect(ApiResponseSchema.safeParse(sample).success).toBe(true);
  });
});
