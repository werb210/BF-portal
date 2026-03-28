import { beforeEach, describe, expect, it } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { apiRequest } from "@/lib/api";
import { assertApiResponse } from "@/lib/assertApiResponse";

describe("api smoke", () => {
  const mock = new MockAdapter(axios, { onNoMatch: "throwException" });

  beforeEach(() => {
    mock.reset();
    sessionStorage.setItem("auth_token", "smoke-token");
  });

  it("calls auth + applications endpoints and validates API response structure", async () => {
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

    expect(auth.sessionId).toBe("session-1");
    expect(Array.isArray(applications)).toBe(true);
    expect(applications[0]).toEqual(expect.objectContaining({ id: "app-1" }));

    expect(assertApiResponse<{ sessionId: string }>({ success: true, data: auth })).toEqual(auth);
    expect(assertApiResponse<Array<{ id: string }>>({ success: true, data: applications })).toEqual(applications);
  });
});
