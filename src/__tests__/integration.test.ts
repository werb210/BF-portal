import { getEnv } from "@/config/env";
import { expect, test } from "vitest";

test("test mode exposes VITE_API_URL", () => {
  expect(import.meta.env.MODE).toBe("test");
  expect(getEnv().VITE_API_URL).toBeTypeOf("string");
  expect(getEnv().VITE_API_URL.length).toBeGreaterThan(0);
});
