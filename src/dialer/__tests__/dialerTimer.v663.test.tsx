// v663 - dialer timer falls back to callStartedAt; login auto-submit fires once per phone.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/auth/otpFlow", () => ({
  clearOtpFlowState: vi.fn(),
  setOtpStartRequested: vi.fn(),
  setOtpStartSucceeded: vi.fn(),
}));

import { useDialer } from "../store";
import DialerPanel from "../components/DialerPanel";
import type { Conference } from "../types";
import Login from "@/pages/Login";

afterEach(() => {
  cleanup();
  useDialer.getState().reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("v663 dialer timer falls back to callStartedAt", () => {
  it("connected stamps the start once; ready/idle/error clear it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const { setStatus } = useDialer.getState();
    expect(useDialer.getState().callStartedAt).toBeNull();
    setStatus("connected");
    expect(useDialer.getState().callStartedAt).toBe("2026-01-01T10:00:00.000Z");
    vi.setSystemTime(new Date("2026-01-01T10:00:30Z"));
    setStatus("connected"); // a reconnect does not restart the clock
    expect(useDialer.getState().callStartedAt).toBe("2026-01-01T10:00:00.000Z");
    for (const s of ["ready", "idle", "error"] as const) {
      setStatus("connected");
      setStatus(s);
      expect(useDialer.getState().callStartedAt).toBeNull();
    }
  });

  it("the in-call timer counts from callStartedAt when there is no conference", () => {
    useDialer.setState({ isOpen: true, status: "connected", conference: null, callStartedAt: new Date(Date.now() - 65_000).toISOString() });
    render(<MemoryRouter><DialerPanel /></MemoryRouter>);
    expect(screen.getByText(/^01:0[5-6]$/)).toBeInTheDocument();
  });

  it("the conference start wins when the server has one", () => {
    const conference = { id: "c1", started_at: new Date(Date.now() - 125_000).toISOString(), recording_sid: null, recording_paused: false, silo: "BF" } as unknown as Conference;
    useDialer.setState({ isOpen: true, status: "connected", conference, callStartedAt: new Date(Date.now() - 5_000).toISOString() });
    render(<MemoryRouter><DialerPanel /></MemoryRouter>);
    expect(screen.getByText(/^02:0[5-6]$/)).toBeInTheDocument();
  });
});

describe("v663 login auto-submit fires once per phone", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  const otpCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/auth/otp/start"));

  it("sends one code for a fully typed phone, even as the page re-renders", async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    const input = screen.getByTestId("phone-input");
    fireEvent.change(input, { target: { value: "416555123" } });
    fireEvent.change(input, { target: { value: "4165551234" } });
    await waitFor(() => expect(otpCalls()).toHaveLength(1));
    expect(JSON.parse(String((otpCalls()[0]![1] as RequestInit).body))).toEqual({ phone: "+14165551234" });
    // Formatting the same number differently is the same phone: no second code.
    fireEvent.change(input, { target: { value: "(416) 555-1234" } });
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    expect(otpCalls()).toHaveLength(1);
    // BF_PORTAL_v789_NATIVE_SESSION_MEMORY - the phone is saved through the session store (localStorage on web).
    expect(localStorage.getItem("auth_phone")).toBe("+14165551234");
  });

  it("a different phone is sent; a failed start can be retried for the same phone", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    render(<MemoryRouter><Login /></MemoryRouter>);
    const input = screen.getByTestId("phone-input");
    fireEvent.change(input, { target: { value: "4165551234" } });
    await screen.findByRole("alert");
    expect(otpCalls()).toHaveLength(1);
    fireEvent.change(input, { target: { value: "6475550000" } });
    await waitFor(() => expect(otpCalls()).toHaveLength(2));
    expect(JSON.parse(String((otpCalls()[1]![1] as RequestInit).body))).toEqual({ phone: "+16475550000" });
  });
});
