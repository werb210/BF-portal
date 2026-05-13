// BF_PORTAL_BLOCK_v201_MAYA_AUDIENCE_HEADER_v1
import { describe, it, expect, vi, beforeEach } from "vitest";

const postMock = vi.fn();
vi.mock("@/api", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));
vi.mock("@/api/http", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor({ status, message }: { status: number; message: string }) {
      super(message);
      this.status = status;
    }
  },
}));

import { sendMayaMessage } from "@/services/mayaService";

describe("BF_PORTAL_BLOCK_v201_MAYA_AUDIENCE_HEADER_v1 — src/services/mayaService.ts", () => {
  beforeEach(() => postMock.mockReset());

  it("sendMayaMessage sends X-Maya-Audience: staff", async () => {
    postMock.mockResolvedValueOnce({});
    await sendMayaMessage("hello");
    expect(postMock).toHaveBeenCalledTimes(1);
    const [path, body, options] = postMock.mock.calls[0];
    expect(path).toBe("/api/ai/maya/message");
    expect(body).toMatchObject({ message: "hello" });
    expect(options?.headers?.["X-Maya-Audience"]).toBe("staff");
  });

  it("returns null on ApiError status 400 (unchanged behaviour)", async () => {
    const { ApiError } = await import("@/api/http");
    postMock.mockRejectedValueOnce(new ApiError({ status: 400, message: "bad" }));
    const r = await sendMayaMessage("bad input");
    expect(r).toBeNull();
  });
});
