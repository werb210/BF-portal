import { describe, expect, it, vi, beforeEach } from "vitest";

const { postMock, getMicrosoftAccessTokenMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMicrosoftAccessTokenMock: vi.fn(),
}));

vi.mock("@/api", () => ({
  api: {
    post: postMock,
  },
}));

vi.mock("@/auth/microsoftToken", () => ({
  getMicrosoftAccessToken: getMicrosoftAccessTokenMock,
}));

vi.mock("@/auth/msal", () => ({
  msalClient: { getAllAccounts: vi.fn() },
}));

import { sendEmail } from "@/api/email";

describe("sendEmail", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMicrosoftAccessTokenMock.mockReset();
  });

  it("attaches X-MS-Access-Token header when a token is available", async () => {
    getMicrosoftAccessTokenMock.mockResolvedValueOnce("ms-token");
    postMock.mockResolvedValueOnce({ ok: true });

    await sendEmail({ to: "a@example.com", subject: "Hello", body: "Hi" });

    expect(postMock).toHaveBeenCalledWith(
      "/api/email/send",
      { to: "a@example.com", subject: "Hello", body: "Hi" },
      { headers: { "X-MS-Access-Token": "ms-token" } }
    );
  });

  it("sends request without X-MS-Access-Token header when token is null", async () => {
    getMicrosoftAccessTokenMock.mockResolvedValueOnce(null);
    postMock.mockResolvedValueOnce({ ok: true });

    await sendEmail({ to: "a@example.com", subject: "Hello", body: "Hi" });

    expect(postMock).toHaveBeenCalledWith(
      "/api/email/send",
      { to: "a@example.com", subject: "Hello", body: "Hi" },
      { headers: {} }
    );
  });
});
