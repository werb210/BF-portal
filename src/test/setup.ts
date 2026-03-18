import "@testing-library/jest-dom/vitest";
import { TextDecoder, TextEncoder } from "node:util";
import { vi } from "vitest";

vi.mock("@tanstack/react-virtual", async () => {
  const mod = await import("../test/mocks/reactVirtual");
  return mod;
});

/**
 * JSDOM stability/polyfills for common UI deps.
 * Keep this file minimal and deterministic.
 */

// --- localStorage/sessionStorage (some libs define them as read-only in JSDOM)
function makeStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

Object.defineProperty(window, "localStorage", { value: makeStorage(), configurable: true, writable: true });
Object.defineProperty(window, "sessionStorage", { value: makeStorage(), configurable: true, writable: true });

// --- matchMedia (used by responsive/layout logic)
if (!window.matchMedia) {
  // @ts-expect-error polyfill
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

// --- ResizeObserver (used by charts/layout components)
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// --- scrollTo (some UI libs call it)
if (!window.scrollTo) {
  window.scrollTo = vi.fn();
}

// --- TextEncoder/TextDecoder (occasionally needed by libs)
if (!(globalThis as any).TextEncoder) {
  (globalThis as any).TextEncoder = TextEncoder;
}
if (!(globalThis as any).TextDecoder) {
  (globalThis as any).TextDecoder = TextDecoder;
}

// --- fetch (ONLY if tests crash due to missing fetch; otherwise avoid mocking)
// If your code uses fetch directly in unit tests, prefer mocking at call sites.
// Uncomment if needed:
// if (!(globalThis as any).fetch) {
//   (globalThis as any).fetch = vi.fn(async () => {
//     throw new Error("fetch called in unit test without mock");
//   });
// }
