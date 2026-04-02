import { describe, expect, it, vi } from "vitest";
import { retry } from "@/modules/chat/api";

describe("chat retry", () => {
  it("recovers from transient failures", async () => {
    const fn = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockRejectedValueOnce(new Error("still temporary"))
      .mockResolvedValue("ok");

    await expect(retry(fn, 3, 1)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws FAILED_AFTER_RETRY after exhausting attempts", async () => {
    const fn = vi.fn<[], Promise<string>>().mockRejectedValue(new Error("down"));

    await expect(retry(fn, 2, 1)).rejects.toThrow("FAILED_AFTER_RETRY");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
