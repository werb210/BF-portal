// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { normalizePhone } from "@/utils/phone";
import { startOtp, verifyOtp } from "@/services/authService";
import LoginPage from "@/pages/login/LoginPage";

let startOtpMock = vi.fn();
let verifyOtpMock = vi.fn();

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    authState: "unauthenticated",
    authStatus: "unauthenticated",
    rolesStatus: "resolved",
    user: null,
    accessToken: null,
    error: null,
    authenticated: false,
    isAuthenticated: false,
    authReady: true,
    isHydratingSession: false,
    pendingPhoneNumber: null,
    startOtp: (...args: Parameters<typeof startOtpMock>) => startOtpMock(...args),
    verifyOtp: (...args: Parameters<typeof verifyOtpMock>) => verifyOtpMock(...args),
    login: async () => undefined,
    setAuth: () => undefined,
    setUser: () => undefined,
    setAuthenticated: () => undefined,
    setAuthState: () => undefined,
    clearAuth: () => undefined,
    refreshUser: async () => false,
    logout: async () => undefined
  })
}));

describe("OTP flow", () => {
  beforeEach(() => {
    startOtpMock = vi.fn();
    verifyOtpMock = vi.fn();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("normalizes 10-digit and + formatted phone numbers", () => {
    expect(normalizePhone("4035551234")).toBe("+14035551234");
    expect(normalizePhone("+14035551234")).toBe("+14035551234");
  });

  test("request OTP sends normalized phone payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    await startOtp("(555) 555-0100");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/otp\/start$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ phone: "+15555550100" })
      })
    );
  });

  test("verify OTP sends both normalized phone and code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    await verifyOtp("1 (555) 555-0100", "123456");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/otp\/verify$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ phone: "+15555550100", code: "123456" })
      })
    );
  });

  test("transitions to OTP code UI after requesting OTP", async () => {
    startOtpMock.mockResolvedValue(true);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "555-555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(startOtpMock).toHaveBeenCalledWith({ phone: "+15555550100" }));
    expect(screen.getByLabelText(/OTP digit 1/i)).toBeInTheDocument();
  });
});
