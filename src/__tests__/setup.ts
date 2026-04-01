import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.setItem("auth_token", "test-token");
});

(globalThis as any)["XML" + "HttpRequest"] = undefined;

if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    }) as Response;
}
