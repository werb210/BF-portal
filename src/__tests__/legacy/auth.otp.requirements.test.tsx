// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import LoginPage from "@/pages/login/LoginPage";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import AuthGuard from "@/router/AuthGuard";
import { startOtp as startOtpService, verifyOtp as verifyOtpService } from "@/services/auth";
import api from "@/lib/api";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";

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

const AuthProbe = () => {
  const { authState } = useAuth();
  return <span data-testid="auth-state">{authState}</span>;
};

const VerifyAndNavigate = ({ phone, code }: { phone: string; code: string }) => {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleVerify = async () => {
    const ok = await verifyOtp(phone, code);
    if (ok) {
      navigate("/dashboard");
    }
  };

  return (
    <button type="button" onClick={handleVerify}>
      Verify OTP
    </button>
  );
};

const RefreshUserHarness = ({ onComplete }: { onComplete?: (result: boolean) => void }) => {
  const { refreshUser } = useAuth();
  const handleRefresh = async () => {
    const result = await refreshUser();
    onComplete?.(result);
  };

  return (
    <button type="button" onClick={handleRefresh}>
      Refresh User
    </button>
  );
};

describe("OTP auth requirements", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    clearStoredAuth();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearStoredAuth();
    api.defaults.adapter = originalAdapter;
  });

  it("renders OTP input after startOtp succeeds", async () => {
    mockedStartOtp.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: "+15555550100" }
    });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByLabelText(/otp digit 1/i)).toBeInTheDocument();
  });

  it("verifies OTP and allows dashboard access", async () => {
    mockedVerifyOtp.mockResolvedValue({
      accessToken: createToken({ id: "u1", role: "Staff" }),
      refreshToken: "refresh"
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <>
                  <VerifyAndNavigate phone="+15555550100" code="123456" />
                  <AuthProbe />
                </>
              }
            />
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div>Dashboard</div>
                </AuthGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /verify otp/i }));

    await waitFor(() =>
      expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated")
    );
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  it("hydrates auth with Authorization header on refreshUser", async () => {
    const token = "stored-token";
    setStoredAccessToken(token);

    const adapter = vi.fn(async (config) => ({
      data: { id: "u1", role: "Staff" },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));
    api.defaults.adapter = adapter;

    render(
      <AuthProvider>
        <RefreshUserHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /refresh user/i }));

    await waitFor(() => expect(adapter).toHaveBeenCalled());
    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig.headers?.Authorization).toBe(`Bearer ${token}`);
  });

  it("sends auth without cookies", async () => {
    setStoredAccessToken("stored-token");

    const adapter = vi.fn(async (config) => ({
      data: { id: "u1", role: "Staff" },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));
    api.defaults.adapter = adapter;

    render(
      <AuthProvider>
        <RefreshUserHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /refresh user/i }));

    await waitFor(() => expect(adapter).toHaveBeenCalled());
    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig.withCredentials).not.toBe(true);
    expect(passedConfig.headers?.Authorization).toBe("Bearer stored-token");
  });
});
