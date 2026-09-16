// BF_PORTAL_RESIGN_REQUEST_v295
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/api", () => ({ api: { post: vi.fn(), get: vi.fn() } }));
import { needsResignature } from "../LendersTab";

describe("re-signature button", () => {
  it("shows only when a new signature is needed and the questions are answered", () => {
    expect(needsResignature({ product_questions: { resignRequired: true, missingCount: 0 } })).toBe(true);
    expect(needsResignature({ product_questions: { resignRequired: true, missingCount: 3 } })).toBe(false);
    expect(needsResignature({ product_questions: { resignRequired: false, missingCount: 0 } })).toBe(false);
    expect(needsResignature({})).toBe(false);
  });
  it("calls the server's request-signature route", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../LendersTab.tsx"), "utf8");
    expect(tab).toContain("/product-questions/request-signature");
    expect(tab).toContain('data-testid="request-resignature"');
  });
});
