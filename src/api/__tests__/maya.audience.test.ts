// BF_PORTAL_BLOCK_v201_MAYA_AUDIENCE_HEADER_v1
import { describe, it, expect, vi, beforeEach } from "vitest";

const postMock = vi.fn();
vi.mock("@/api", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { sendMayaMessage, escalateToHuman } from "@/api/maya";

describe("BF_PORTAL_BLOCK_v201_MAYA_AUDIENCE_HEADER_v1 — src/api/maya.ts", () => {
  beforeEach(() => postMock.mockReset());

  it("sendMayaMessage sends X-Maya-Audience: staff", async () => {
    postMock.mockResolvedValueOnce({});
    await sendMayaMessage("hello");
    expect(postMock).toHaveBeenCalledTimes(1);
    const [path, body, options] = postMock.mock.calls[0];
    expect(path).toBe("/api/maya/message");
    expect(body).toMatchObject({ message: "hello", surface: "staff_portal" });
    expect(options?.headers?.["X-Maya-Audience"]).toBe("staff");
  });

  it("escalateToHuman sends X-Maya-Audience: staff", async () => {
    postMock.mockResolvedValueOnce({});
    await escalateToHuman();
    expect(postMock).toHaveBeenCalledTimes(1);
    const [path, body, options] = postMock.mock.calls[0];
    expect(path).toBe("/api/maya/escalate");
    expect(body).toMatchObject({ reason: "user_requested_human" });
    expect(options?.headers?.["X-Maya-Audience"]).toBe("staff");
  });
});
