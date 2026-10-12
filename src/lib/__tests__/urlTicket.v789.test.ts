// BF_PORTAL_v789_URL_TICKET
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ post: vi.fn(), token: "staff.jwt.token" as string | null }));
vi.mock("@/api", () => ({ api: { post: h.post } }));
vi.mock("@/lib/authToken", () => ({ getAuthToken: () => h.token }));

import { ApiError } from "@/api/http";
import { getUrlTicket, teamSocketUrl } from "@/lib/urlTicket";

beforeEach(() => { h.post.mockReset(); h.token = "staff.jwt.token"; });

describe("getUrlTicket", () => {
  it("POSTs /api/auth/url-ticket and returns the ticket, not the JWT", async () => {
    h.post.mockResolvedValue({ ticket: "tkt_1" });
    await expect(getUrlTicket()).resolves.toBe("tkt_1");
    expect(h.post).toHaveBeenCalledWith("/api/auth/url-ticket", {});
  });

  it("falls back to the auth token when the server is older than v789 (404)", async () => {
    h.post.mockRejectedValue(new ApiError({ status: 404, message: "Not Found" }));
    await expect(getUrlTicket()).resolves.toBe("staff.jwt.token");
  });

  it("does not fall back on other failures", async () => {
    h.post.mockRejectedValue(new ApiError({ status: 500, message: "boom" }));
    await expect(getUrlTicket()).rejects.toThrow("boom");
    h.post.mockResolvedValue({});
    await expect(getUrlTicket()).rejects.toThrow("url_ticket_missing");
  });

  it("builds the team socket URL with a fresh ticket each time", async () => {
    h.post.mockResolvedValueOnce({ ticket: "a b" }).mockResolvedValueOnce({ ticket: "c" });
    await expect(teamSocketUrl("https://server.example")).resolves.toBe("wss://server.example/api/team/ws?token=a%20b");
    await expect(teamSocketUrl("http://localhost:3000")).resolves.toBe("ws://localhost:3000/api/team/ws?token=c");
  });
});
