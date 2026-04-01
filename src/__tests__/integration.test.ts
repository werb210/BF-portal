import { expect, test } from "vitest";

test("test mode does not expose VITE_API_URL", () => {
  expect(import.meta.env.MODE).toBe("test");
  expect(import.meta.env.VITE_API_URL).toBeFalsy();
});
