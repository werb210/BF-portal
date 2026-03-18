// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/auth/AuthContext";
import LoginPage from "@/pages/login/LoginPage";
import { loginWithOtp as loginWithOtpService, startOtp as startOtpService } from "@/services/auth";

vi.mock("@/services/auth", () => ({
  startOtp: vi.fn(),
  loginWithOtp: vi.fn(),
  logout: vi.fn()
}));

const mockedStartOtp = vi.mocked(startOtpService);
const mockedLoginWithOtp = vi.mocked(loginWithOtpService);

const renderLoginFlow = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<div>Portal</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );

describe("login flow", () => {
  beforeEach(() => {
    mockedStartOtp.mockReset();
    mockedLoginWithOtp.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigates to portal after OTP verification", async () => {
    mockedStartOtp.mockResolvedValue(null);
    mockedLoginWithOtp.mockResolvedValue({ token: "access", user: { id: "1", role: "Staff" }, nextPath: "/portal" } as any);
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "1", role: "Staff" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", fetchSpy);

    renderLoginFlow();

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 (555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(mockedStartOtp).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/OTP digit 1/i), { target: { value: "123456" } });

    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => expect(mockedLoginWithOtp).toHaveBeenCalledWith("+15555550100", "123456"));
    await waitFor(() => expect(screen.getByText("Portal")).toBeInTheDocument());
  });

  it("fires Send code exactly once for rapid clicks", async () => {
    mockedStartOtp.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(null), 25)));

    renderLoginFlow();

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 (555) 555-0100" } });
    const sendButton = screen.getByRole("button", { name: /Send code/i });
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    await waitFor(() => expect(mockedStartOtp).toHaveBeenCalledTimes(1));
  });

  it("stays on login step and shows an inline error when OTP start returns false", async () => {
    mockedStartOtp.mockResolvedValue(false as unknown as null);

    renderLoginFlow();

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 (555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(mockedStartOtp).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText(/Phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to send verification code/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/OTP digit 1/i)).not.toBeInTheDocument();
  });

  it("only advances to OTP verification step after OTP start succeeds", async () => {
    mockedStartOtp.mockResolvedValue(null);

    renderLoginFlow();

    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: "+1 (555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    expect(screen.queryByLabelText(/OTP digit 1/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mockedStartOtp).toHaveBeenCalledTimes(1));
    expect(await screen.findByLabelText(/OTP digit 1/i)).toBeInTheDocument();
  });

});
