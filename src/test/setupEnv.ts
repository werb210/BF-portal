import { afterEach, vi } from "vitest";

Object.assign(import.meta.env, {
  VITE_API_BASE: "http://localhost:3000",
  VITE_API_URL: "http://localhost:3000",
  VITE_JWT_STORAGE_KEY: "auth_token",
});

afterEach(() => {
  vi.clearAllMocks();
});
