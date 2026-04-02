import { env } from "@/config/env";
import { expect, test } from "vitest";

test("test mode exposes VITE_API_URL", () => {
  expect(import.meta.env.MODE).toBe("test");
  expect(env.API_URL).toBeTypeOf("string");
  expect(env.API_URL.length).toBeGreaterThan(0);
});
