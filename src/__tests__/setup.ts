import { beforeEach, vi } from "vitest";

const blocked = () => {
  throw new Error("NETWORK_BLOCKED");
};

vi.mock("axios", () => ({
  default: blocked,
}));

global.fetch = blocked as typeof fetch;
global.XMLHttpRequest = blocked as unknown as typeof XMLHttpRequest;
global.WebSocket = blocked as unknown as typeof WebSocket;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});


Object.defineProperty(window, "__API_BASE__", {
  configurable: true,
  writable: true,
  value: "/",
});
