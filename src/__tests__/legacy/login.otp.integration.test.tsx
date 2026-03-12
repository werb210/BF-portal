// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { defaultHandlers } from "@/tests/msw/defaultHandlers";
import { AuthProvider } from "@/auth/AuthContext";
import LoginPage from "@/pages/login/LoginPage";
import { clearStoredAuth } from "@/services/token";

const startOtpSpy = vi.fn();
const verifyOtpSpy = vi.fn();
const meSpy = vi.fn();

const server = setupServer(
  http.post("http://localhost/api/auth/otp/start", async ({ request }) => {
    startOtpSpy(await request.json());
    return new HttpResponse(null, {
      status: 204,
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

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

describe("OTP login flow end-to-end", () => {
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

  it("TEST 1 — LOGIN PAGE RENDERS", () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByLabelText(/Phone number/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send code/i })).toBeInTheDocument();
  });

  it("TEST 2 — OTP REQUEST", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Phone number/i), "+15555550100");
    await user.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => {
      expect(startOtpSpy).toHaveBeenCalledTimes(1);
      expect(startOtpSpy).toHaveBeenCalledWith({ phone: "+15555550100" });
    });

    expect(await screen.findByLabelText(/OTP digit 1/i)).toBeInTheDocument();
  });

  it("TEST 3 — OTP VERIFY", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Phone number/i), "+15555550100");
    await user.click(screen.getByRole("button", { name: /Send code/i }));

    const otpInput = await screen.findByLabelText(/OTP digit 1/i);
    await user.type(otpInput, "123456");

    await waitFor(() => {
      expect(verifyOtpSpy).toHaveBeenCalledTimes(1);
      expect(verifyOtpSpy).toHaveBeenCalledWith({ phone: "+15555550100", code: "123456" });
    });

    await waitFor(() => {
      expect(meSpy).toHaveBeenCalled();
    });
  });

  it("TEST 4 — POST LOGIN ROUTE", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Phone number/i), "+15555550100");
    await user.click(screen.getByRole("button", { name: /Send code/i }));

    const otpInput = await screen.findByLabelText(/OTP digit 1/i);
    await user.type(otpInput, "123456");

    await waitFor(() => {
      expect(meSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    });
  });
});
