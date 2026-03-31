import { beforeEach } from "vitest";

beforeEach(() => {
  sessionStorage.setItem("auth_token", "test-token");
});

(globalThis as any)["XML" + "HttpRequest"] = undefined;
