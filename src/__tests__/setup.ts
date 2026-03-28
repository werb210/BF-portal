import { beforeEach } from "vitest";

beforeEach(() => {
  localStorage.setItem("auth_token", "test-token");
});

(globalThis as any).XMLHttpRequest = undefined;
