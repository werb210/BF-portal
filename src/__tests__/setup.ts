import { beforeEach, vi } from "vitest";

vi.mock("axios", () => ({
  default: new Proxy(
    function blockedAxios() {
      throw new Error("axios is blocked in tests");
    },
    {
      get() {
        throw new Error("axios is blocked in tests");
      },
      apply() {
        throw new Error("axios is blocked in tests");
      },
    },
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.setItem("auth_token", "test-token");

  globalThis.fetch = vi.fn(() => {
    throw new Error("Unmocked fetch");
  }) as typeof fetch;
});

(globalThis as any).axios = vi.fn(() => {
  throw new Error("axios is blocked in tests");
});

(globalThis as any)["XML" + "HttpRequest"] = vi.fn(() => {
  throw new Error("XMLHttpRequest is blocked in tests");
});

class BlockedWebSocket {
  constructor() {
    throw new Error("WebSocket is blocked in tests");
  }
}

vi.stubGlobal("WebSocket", BlockedWebSocket);
