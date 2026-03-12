import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { defaultHandlers } from "@/tests/msw/defaultHandlers";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import LoginPage from "@/pages/login/LoginPage";
import { clearStoredAuth } from "@/services/token";

const startOtpSpy = vi.fn();
const verifyOtpSpy = vi.fn();
const meSpy = vi.fn();

const server = setupServer(
  http.post("http://localhost/api/auth/otp/start", async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    expect(contentType.toLowerCase()).toContain("application/json");
    expect(request.headers.has("x-request-id")).toBe(true);
    startOtpSpy(await request.json());
    return HttpResponse.json({ requestId: "req-otp" }, {
      status: 200,
      headers: {
        "x-twilio-sid": "twilio-sid"
      }
    });
  }),
  http.post("http://localhost/api/auth/otp/verify", async ({ request }) => {
    verifyOtpSpy(await request.json());
    return HttpResponse.json({ accessToken: "access-token", refreshToken: "refresh-token" });
  }),
  http.get("*/api/auth/me", () => {
    meSpy();
    return HttpResponse.json({ id: "u1", role: "Staff" }, { status: 200 });
  }),
  ...defaultHandlers
);

const AuthProbe = () => {
  const { authenticated, authStatus, rolesStatus, user } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{String(authenticated)}</span>
      <span data-testid="auth-state">{authStatus}</span>
      <span data-testid="roles-state">{rolesStatus}</span>
      <span data-testid="auth-user">{user ? JSON.stringify(user) : ""}</span>
    </div>
  );
};

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

describe("login contract flow", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
    clearStoredAuth();
    startOtpSpy.mockClear();
    verifyOtpSpy.mockClear();
    meSpy.mockClear();
  });

  afterAll(() => {
    server.close();
  });

  it("authenticates via OTP and redirects away from /login", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
          <AuthProbe />
          <LocationProbe />
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Phone number/i), "+15555550100");
    await user.click(screen.getByRole("button", { name: /Send code/i }));

    expect(startOtpSpy).toHaveBeenCalledTimes(1);
    expect(startOtpSpy).toHaveBeenCalledWith({ phone: "+15555550100" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Code sent. Check your phone for the verification code."
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    const otpInput = await screen.findByLabelText(/OTP digit 1/i);
    await user.type(otpInput, "123456");

    await waitFor(() => {
      expect(verifyOtpSpy).toHaveBeenCalledTimes(1);
      expect(verifyOtpSpy).toHaveBeenCalledWith({ phone: "+15555550100", code: "123456" });
    });

    await waitFor(() => {
      expect(meSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("true");
      expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("roles-state")).toHaveTextContent("resolved");
      expect(screen.getByTestId("auth-user")).toHaveTextContent("\"role\":\"Staff\"");
    });

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    });
  }, 10000);
});
