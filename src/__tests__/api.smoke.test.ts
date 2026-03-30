import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api";
import { assertApiResponse } from "@/lib/assertApiResponse";

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
}));

describe("api smoke", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
    sessionStorage.setItem("auth_token", "smoke-token");
  });

  it("calls auth + applications endpoints and validates API response structure", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ sessionId: "session-1" })
      .mockResolvedValueOnce([{ id: "app-1" }]);

    const auth = await apiRequest<{ sessionId: string }>("post", "/api/auth/otp/start", {
      phone: "15551234567",
    });

    const applications = await apiRequest<Array<{ id: string }>>("get", "/applications");

    expect(auth.sessionId).toBe("session-1");
    expect(Array.isArray(applications)).toBe(true);
    expect(applications[0]).toEqual(expect.objectContaining({ id: "app-1" }));

    expect(assertApiResponse<{ sessionId: string }>({ success: true, data: auth })).toEqual(auth);
    expect(assertApiResponse<Array<{ id: string }>>({ success: true, data: applications })).toEqual(applications);
  });
});
