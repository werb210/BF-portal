import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.setItem("auth_token", "test-token");

  globalThis.fetch = vi.fn(() => {
    throw new Error("Unmocked fetch call detected");
  }) as typeof fetch;
});

(globalThis as any)["XML" + "HttpRequest"] = undefined;
