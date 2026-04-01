import { beforeEach } from "vitest";

beforeEach(() => {
  sessionStorage.setItem("auth_token", "test-token");
});

(globalThis as any)["XML" + "HttpRequest"] = undefined;

if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
      text: async () => "ok",
    }) as Response;
}
