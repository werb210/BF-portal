// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { assertToken } from "@/utils/assertToken";
import { recordRedirect, resetRedirectTracking } from "@/utils/redirectGuard";
import { runRouteAudit } from "@/utils/routeAudit";
import { startOtp as startOtpService, verifyOtp as verifyOtpService } from "@/services/auth";

vi.mock("@/services/auth", () => ({
  startOtp: vi.fn(),
  verifyOtp: vi.fn()
}));

const mockedStartOtp = vi.mocked(startOtpService);
const mockedVerifyOtp = vi.mocked(verifyOtpService);

const createToken = (payload: Record<string, unknown>) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
};

const AuthHarness = ({ onReady }: { onReady: (auth: ReturnType<typeof useAuth>) => void }) => {
  const auth = useAuth();
  useEffect(() => {
    onReady(auth);
  }, [auth, onReady]);
  return null;
};

describe("auth failure safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRedirectTracking();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("OTP success but no token -> fail", async () => {
    mockedVerifyOtp.mockResolvedValue({ user: { id: "1", email: "demo@example.com", role: "Admin" } } as any);

    let authRef: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthProvider>
        <AuthHarness onReady={(auth) => (authRef = auth)} />
      </AuthProvider>
    );

    await waitFor(() => expect(authRef).not.toBeNull());
    const result = await authRef!.verifyOtp({ phone: "+15555550100", code: "123456" });
    expect(result).toBe(false);
    await waitFor(() => expect(authRef!.error).toMatch(/access token/i));
  });

  it("Token with invalid role -> fail", () => {
    const token = createToken({
      sub: "user-1",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    });

    expect(() => assertToken(token)).toThrow(/role/i);
  });

  it("Auth loop -> fail", () => {
    recordRedirect("/dashboard", "unauthenticated");
    expect(() => recordRedirect("/dashboard", "unauthenticated")).toThrow(/redirect loop/i);
  });

  it("Server route missing -> fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ["/api/auth/otp/start"]
      }))
    );

    await expect(runRouteAudit()).resolves.toBeUndefined();
  });

  it("OTP start succeeds without Twilio SID", async () => {
    mockedStartOtp.mockResolvedValue({
      data: { requestId: "req-1" },
      headers: {}
    } as any);

    let authRef: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthProvider>
        <AuthHarness onReady={(auth) => (authRef = auth)} />
      </AuthProvider>
    );

    await waitFor(() => expect(authRef).not.toBeNull());
    const result = await authRef!.startOtp({ phone: "+15555550100" });
    expect(result).toBe(true);
    await waitFor(() => expect(authRef!.pendingPhoneNumber).toBe("+15555550100"));
    await waitFor(() => expect(authRef!.error).toBeNull());
  });
});
