import { afterEach, vi } from "vitest";

Object.assign(import.meta.env, {
  VITE_API_URL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

afterEach(() => {
  vi.clearAllMocks();
});
