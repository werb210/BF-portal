import { describe, expect, it } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { apiRequest } from "@/lib/api";

describe("api smoke", () => {
  const mock = new MockAdapter(axios, { onNoMatch: "throwException" });

  it("calls auth + applications endpoints with ApiResponse shape", async () => {
    mock.onPost("/api/auth/otp/start").reply(200, {
      success: true,
      data: { sessionId: "session-1" },
    });

    mock.onGet("/api/applications").reply(200, {
      success: true,
      data: [{ id: "app-1" }],
    });

    const auth = await apiRequest<{ sessionId: string }>("/auth/otp/start", {
      method: "POST",
      body: { phone: "15551234567" },
    });

    const applications = await apiRequest<Array<{ id: string }>>("/applications");

    expect(auth.success).toBe(true);
    expect(auth.data.sessionId).toBe("session-1");

    expect(applications.success).toBe(true);
    expect(Array.isArray(applications.data)).toBe(true);
    expect(applications.data[0]).toEqual(expect.objectContaining({ id: "app-1" }));
  });
});

