import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

if (typeof window.localStorage === "undefined") {
  const storage = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
    writable: true,
  });
}

if (typeof globalThis.StorageEvent === "undefined") {
  class MockStorageEvent extends Event {
    key: string | null;
    newValue: string | null;

    constructor(type: string, init: StorageEventInit = {}) {
      super(type, init);
      this.key = init.key ?? null;
      this.newValue = init.newValue ?? null;
    }
  }

  Object.defineProperty(globalThis, "StorageEvent", {
    configurable: true,
    value: MockStorageEvent,
    writable: true,
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});
