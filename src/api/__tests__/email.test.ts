import { describe, expect, it, vi, beforeEach } from "vitest";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("@/api", () => ({
  api: Object.assign(
    // The new sendEmail uses api.post
    vi.fn(),
    { post: postMock }
  ),
}));

vi.mock("./o365Interceptor", () => ({
  withO365Refresh: <T,>(call: () => Promise<T>) => call(),
}));

import { sendEmail } from "@/api/email";

describe("sendEmail", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("posts to /api/o365/mail/send with normalized payload", async () => {
    postMock.mockResolvedValueOnce({ ok: true });

    await sendEmail({ to: "a@example.com", subject: "Hello", body: "<p>Hi</p>" });

    expect(postMock).toHaveBeenCalledWith("/api/o365/mail/send", {
      to: ["a@example.com"],
      cc: [],
      bcc: [],
      subject: "Hello",
      body_html: "<p>Hi</p>",
    });
  });

  it("normalizes a `to` array as-is and includes cc/bcc when provided", async () => {
    postMock.mockResolvedValueOnce({ ok: true });

    await sendEmail({
      to: ["a@example.com", "b@example.com"],
      cc: ["c@example.com"],
      bcc: ["d@example.com"],
      subject: "Multi",
      body: "<p>Body</p>",
    });

    expect(postMock).toHaveBeenCalledWith("/api/o365/mail/send", {
      to: ["a@example.com", "b@example.com"],
      cc: ["c@example.com"],
      bcc: ["d@example.com"],
      subject: "Multi",
      body_html: "<p>Body</p>",
    });
  });

  it("defaults cc and bcc to empty arrays when omitted", async () => {
    postMock.mockResolvedValueOnce({ ok: true });

    await sendEmail({ to: "x@example.com", subject: "S", body: "B" });

    const callArgs = postMock.mock.calls[0];
    expect(callArgs[1]).toMatchObject({ cc: [], bcc: [] });
  });

  it("does NOT send X-MS-Access-Token header (server uses stored token)", async () => {
    postMock.mockResolvedValueOnce({ ok: true });

    await sendEmail({ to: "x@example.com", subject: "S", body: "B" });

    // The new sendEmail makes a 2-arg call: (path, body) — no third options
    // arg with headers. Verify exactly 2 args were passed.
    const callArgs = postMock.mock.calls[0];
    expect(callArgs.length).toBe(2);
  });
});
