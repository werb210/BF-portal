// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import RequireAuth from "@/routes/RequireAuth";
import { startOtp as startOtpService, verifyOtp as verifyOtpService, logout as logoutService } from "@/services/auth";
import LoginPage from "@/pages/login/LoginPage";
import PrivateRoute from "@/router/PrivateRoute";
import { ApiError } from "@/api/http";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";
import api from "@/lib/api";

vi.mock("@/services/auth", () => ({
  startOtp: vi.fn(),
  verifyOtp: vi.fn(),
  logout: vi.fn()
}));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    redirectToLogin: vi.fn()
  };
});

const mockedStartOtp = vi.mocked(startOtpService);
const mockedVerifyOtp = vi.mocked(verifyOtpService);
const mockedLogout = vi.mocked(logoutService);

const createAuthAdapter = (data: unknown, status = 200) =>
  vi.fn((config: InternalAxiosRequestConfig) =>
    Promise.resolve<AxiosResponse>({
      data,
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: {},
      config,
      request: {}
    })
  );

const TestAuthState = () => {
  const { authStatus, rolesStatus } = useAuth();
  return createElement("span", { "data-testid": "status" }, `${authStatus}:${rolesStatus}`);
};

const TestAuthRole = () => {
  const { user } = useAuth();
  return createElement("span", { "data-testid": "role" }, user?.role ?? "unassigned");
};

const TestVerifyAction = () => {
  const { verifyOtp } = useAuth();
  return createElement(
    "button",
    {
      type: "button",
      onClick: () => void verifyOtp("+15555550100", "123456")
    },
    "Verify"
  );
};

const TestLogoutAction = () => {
  const { logout } = useAuth();
  return createElement("button", { type: "button", onClick: () => logout() }, "Logout");
};

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

describe("auth flow", () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    api.defaults.adapter = originalAdapter;
  });

  beforeEach(() => {
    clearStoredAuth();
    vi.clearAllMocks();
    mockedLogout.mockResolvedValue(undefined);
  });

  it("verifies OTP successfully", async () => {
    const adapter = createAuthAdapter({ id: "1", role: "Admin" });
    api.defaults.adapter = adapter as AxiosAdapter;
    mockedVerifyOtp.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });

    render(
      <AuthProvider>
        <TestVerifyAction />
        <TestAuthState />
        <TestAuthRole />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );
    expect(screen.getByTestId("role")).toHaveTextContent("Admin");
    expect(adapter).toHaveBeenCalled();
    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig.headers?.Authorization).toBe("Bearer access");
    expect(passedConfig.withCredentials).toBe(true);
  });

  it("does not redirect during auth hydration after OTP verification", async () => {
    mockedStartOtp.mockResolvedValue(null);
    mockedVerifyOtp.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });

    let resolveRequest: (payload: { id: string; role: string }) => void = () => undefined;
    const pendingAdapter = vi.fn((config: InternalAxiosRequestConfig) =>
      new Promise<AxiosResponse>((resolve) => {
        resolveRequest = (payload) =>
          resolve({
            data: payload,
            status: 200,
            statusText: "OK",
            headers: {},
            config,
            request: {}
          });
      })
    );
    api.defaults.adapter = pendingAdapter as AxiosAdapter;

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute allowedRoles={["Admin", "Staff"]}>
                  <div>Dashboard</div>
                </PrivateRoute>
              }
            />
          </Routes>
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 555 555 0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    const otpInput = await screen.findByLabelText(/otp digit 1/i);
    fireEvent.change(otpInput, { target: { value: "123456" } });

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });

    resolveRequest({ id: "1", role: "Staff" });

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders protected routes after /api/auth/me succeeds", async () => {
    setStoredAccessToken("test-token");
    api.defaults.adapter = createAuthAdapter({ id: "1", role: "Staff" });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute allowedRoles={["Admin", "Staff"]}>
                  <div>Dashboard Shell</div>
                </PrivateRoute>
              }
            />
          </Routes>
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Dashboard Shell")).toBeInTheDocument());
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("hydrates user on refresh", async () => {
    setStoredAccessToken("test-token");
    api.defaults.adapter = createAuthAdapter({ id: "1", role: "Admin", email: "demo@example.com" });

    render(
      <AuthProvider>
        <TestAuthState />
        <TestAuthRole />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );
    expect(screen.getByTestId("role")).toHaveTextContent("Admin");
  });

  it.each([
    ["invalid_otp", 401],
    ["missing_idempotency_key", 400]
  ])("surfaces OTP failures for %s", async (code, status) => {
    if (code === "missing_idempotency_key") {
      mockedStartOtp.mockRejectedValue(new ApiError({ status, message: "Start failed", code }));
    } else {
      mockedVerifyOtp.mockRejectedValue(new ApiError({ status, message: "Verify failed", code }));
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 555 555 0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    if (code !== "missing_idempotency_key") {
      await waitFor(() => expect(mockedStartOtp).toHaveBeenCalled());
      fireEvent.change(screen.getByLabelText(/OTP digit 1/i), { target: { value: "000000" } });
    }

    await waitFor(() => expect(screen.getByText(/failed/i)).toBeInTheDocument());
  });

  it("clears token on manual logout", async () => {
    setStoredAccessToken("test-token");
    api.defaults.adapter = createAuthAdapter({ id: "1", role: "Admin", email: "demo@example.com" });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <TestAuthState />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <div>
                    <TestLogoutAction />
                  </div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => expect(mockedLogout).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated:resolved")
    );
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
  });
});
