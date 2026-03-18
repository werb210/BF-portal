// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "@/App";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";
import api from "@/lib/api";

type MockAuthMePayload = {
  ok: boolean;
  role: string | null;
};

const mockAuthMe = ({ ok, role }: MockAuthMePayload) => {
  let resolve: (value: { id: string; role: string | null } | null) => void = () => undefined;
  const pending = new Promise<{ id: string; role: string | null } | null>((resolver) => {
    resolve = resolver;
  });
  const response = ok ? { id: "u1", role } : null;
  api.defaults.adapter = vi.fn((config) =>
    pending.then((payload) => ({
      data: payload,
      status: ok ? 200 : 401,
      statusText: ok ? "OK" : "Unauthorized",
      headers: {},
      config
    }))
  );

  return { resolve: () => resolve(response) };
};

describe("auth hydration stability", () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    clearStoredAuth();
    vi.unstubAllGlobals();
    api.defaults.adapter = originalAdapter;
  });

  it("does not redirect or blank screen during auth hydration", async () => {
    setStoredAccessToken("test-token");
    mockAuthMe({ ok: true, role: null });

    render(<App />);

    expect(screen.getByTestId("auth-probe")).toHaveTextContent("false");
  });
});
