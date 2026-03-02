import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";

const originalFetch = globalThis.fetch.bind(globalThis);
const fixedDate = new Date("2026-01-01T00:00:00Z");

const formatNetworkError = (transport: string, url?: string | URL | null) => {
  const target = typeof url === "string" ? url : url?.toString() ?? "<unknown>";
  return `[network-guard] Unexpected ${transport} call in test: ${target}. Add an MSW handler or mock the module.`;
};

beforeAll(() => {
  (window as Window & { __DISABLE_AUTO_REDIRECT__?: boolean }).__DISABLE_AUTO_REDIRECT__ = true;

  server.listen({
    onUnhandledRequest(request) {
      throw new Error(formatNetworkError("request", request.url));
    }
  });

  vi.spyOn(Date, "now").mockImplementation(() => fixedDate.getTime());
  vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => "00000000-0000-4000-8000-000000000000");
  vi.spyOn(Math, "random").mockImplementation(() => 0.123456789);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await originalFetch(input, init);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(formatNetworkError("fetch", typeof input === "string" ? input : input.toString()));
      throw error;
    }
  };
});

afterEach(() => {
  server.resetHandlers();
  delete (window as Window & { __TEST_AUTH__?: { isAuthenticated?: boolean; role?: string } }).__TEST_AUTH__;
  (window as Window & { __DISABLE_AUTO_REDIRECT__?: boolean }).__DISABLE_AUTO_REDIRECT__ = true;
});

afterAll(() => {
  server.close();
  globalThis.fetch = originalFetch;
});

process.env.NODE_ENV = "test";
