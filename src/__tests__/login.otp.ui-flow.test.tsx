// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "@/pages/login/LoginPage";
import { ApiError } from "@/api/http";

let startOtpMock = vi.fn();
let verifyOtpMock = vi.fn();

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
    logout: async () => undefined,
  }),
}));

describe("login otp ui flow", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderLogin = () =>
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

  it("send code success transitions to verify step without crash", async () => {
    startOtpMock.mockResolvedValue({ ok: true });
    verifyOtpMock.mockResolvedValue(true);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "+1 (555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));

    await waitFor(() => expect(startOtpMock).toHaveBeenCalledWith({ phone: "+1 (555) 555-0100" }));
    expect(await screen.findByLabelText(/otp digit 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
    expect(screen.queryByText(/Portal encountered an unexpected error/i)).not.toBeInTheDocument();
  });

  it("verify button triggers network request with phone and code", async () => {
    startOtpMock.mockResolvedValue(true);
    verifyOtpMock.mockResolvedValue(true);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "+15555550100" } });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));
    await waitFor(() => expect(startOtpMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/otp digit 1/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => expect(verifyOtpMock).toHaveBeenCalledWith({ phone: "+15555550100", code: "123456" }));
  });

  it("verify success path does not render inline error", async () => {
    startOtpMock.mockResolvedValue(true);
    verifyOtpMock.mockResolvedValue(true);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "+15555550100" } });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));
    await waitFor(() => expect(startOtpMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/otp digit 1/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => expect(verifyOtpMock).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("verify failure shows inline invalid code error", async () => {
    startOtpMock.mockResolvedValue(true);
    verifyOtpMock.mockRejectedValue(new ApiError({ status: 401, message: "Invalid code", requestId: "req-otp" }));

    renderLogin();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "+15555550100" } });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));
    await waitFor(() => expect(startOtpMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/otp digit 1/i), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByText(/Invalid verification code/i)).toBeInTheDocument();
    expect(screen.getByText(/Request ID: req-otp/i)).toBeInTheDocument();
  });
});
