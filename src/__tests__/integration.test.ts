import { expect, test } from "vitest";

test("test mode exposes VITE_API_URL", () => {
  expect(import.meta.env.MODE).toBe("test");
  expect(import.meta.env.VITE_API_URL).toBeTypeOf("string");
  expect(import.meta.env.VITE_API_URL.length).toBeGreaterThan(0);
});
