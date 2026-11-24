// BF_PORTAL_BI_GOVID_MASK_v1
import { describe, expect, it } from "vitest";
import { maskId } from "../ApplicationTab";

describe("gov ID mask", () => {
  it("shows only the last 4", () => {
    expect(maskId("X00000001234")).toBe("••••••••1234");
    expect(maskId("123")).toBe("••••");
  });
});
