// @vitest-environment jsdom
import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import LoginPage from "./LoginPage";
import { ApiError } from "@/api/http";
import { MemoryRouter } from "react-router-dom";

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

describe("LoginPage", () => {
  beforeEach(() => {
    startOtpMock = vi.fn();
    verifyOtpMock = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  const renderLogin = (startOtp = vi.fn(), verifyOtp = vi.fn()) => {
    startOtpMock = startOtp;
    verifyOtpMock = verifyOtp;

    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  };

  test("send code success transitions to verify step", async () => {
    const startOtp = vi.fn().mockResolvedValue(true);
    renderLogin(startOtp, vi.fn());

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 (555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(startOtp).toHaveBeenCalledWith({ phone: "+1 (555) 555-0100" }));
    expect(await screen.findByLabelText(/OTP digit 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verify/i })).toBeInTheDocument();
  });

  test("verify button triggers network request", async () => {
    const verifyOtp = vi.fn().mockResolvedValue(true);
    renderLogin(vi.fn().mockResolvedValue(true), verifyOtp);

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 (555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));
    await waitFor(() => expect(screen.getByLabelText(/OTP digit 1/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/OTP digit 1/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith({ code: "123456", phone: "+15555550100" }));
  });

  test("verify success does not show inline error", async () => {
    const verifyOtp = vi.fn().mockResolvedValue(true);
    renderLogin(vi.fn().mockResolvedValue(true), verifyOtp);

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 (555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(screen.getByLabelText(/OTP digit 1/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/OTP digit 1/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => expect(verifyOtp).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("verify failure shows inline error", async () => {
    const verifyOtp = vi
      .fn()
      .mockRejectedValue(new ApiError({ status: 401, message: "Invalid code", requestId: "req-401" }));
    renderLogin(vi.fn(), verifyOtp);

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+15555550100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));
    await waitFor(() => expect(screen.getByLabelText(/OTP digit 1/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/OTP digit 1/i), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => expect(verifyOtp).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Invalid verification code/i)).toBeInTheDocument());
    expect(screen.getByText(/Request ID: req-401/i)).toBeInTheDocument();
    expect(screen.getByText(/Endpoint: \/auth\/otp\/verify/i)).toBeInTheDocument();
  });

  test("no crash after successful otp start", async () => {
    renderLogin(vi.fn().mockResolvedValue(true), vi.fn());

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+15555550100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(screen.getByLabelText(/OTP digit 1/i)).toBeInTheDocument());
    expect(await screen.findByText(/Code sent/i)).toBeInTheDocument();
    expect(screen.queryByText(/Portal encountered an unexpected error/i)).not.toBeInTheDocument();
  });

  test("shows server error details when OTP start fails", async () => {
    const startOtp = vi.fn().mockRejectedValue({
      response: {
        headers: { "x-request-id": "req-123" },
        data: { error: { message: "Phone blocked" } },
      },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderLogin(startOtp, vi.fn());

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+15555550100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    expect(await screen.findByText(/Phone blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Request ID: req-123/i)).toBeInTheDocument();
    expect(screen.getByText(/Endpoint: \/auth\/otp\/start/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
