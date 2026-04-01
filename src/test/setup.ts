import '@testing-library/jest-dom';
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

global.fetch = vi.fn(() => {
  throw new Error("UNMOCKED_FETCH");
}) as unknown as typeof fetch;
