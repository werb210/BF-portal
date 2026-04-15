import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

class MockStorageEvent extends Event {
  key: string | null = null;
  newValue: string | null = null;
}

(globalThis as any).StorageEvent = MockStorageEvent;

vi.mock("axios", () => ({
  default: vi.fn(() => {
    throw new Error("NETWORK_BLOCKED");
  }),
}));

globalThis.fetch = vi.fn(() => {
  throw new Error("UNMOCKED_FETCH");
}) as unknown as typeof fetch;
globalThis.XMLHttpRequest = vi.fn(() => {
  throw new Error("NETWORK_BLOCKED");
}) as unknown as typeof XMLHttpRequest;
globalThis.WebSocket = vi.fn(() => {
  throw new Error("NETWORK_BLOCKED");
}) as unknown as typeof WebSocket;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

Object.defineProperty(window, "__API_BASE__", {
  configurable: true,
  writable: true,
  value: "/",
});


afterEach(() => {
  vi.clearAllMocks();
});
