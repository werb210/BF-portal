// BF_PORTAL_BLOCK_v514_LARGE_EMAIL_ATTACHMENTS
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "../O365ComposeModal.tsx"), "utf8");

describe("v514 composer attachment limits", () => {
  it("allows 25 MB per email and checks the running total", () => {
    expect(src).toContain("const MAX_ATTACH_TOTAL_BYTES = 25 * 1024 * 1024;");
    expect(src).toContain("used + f.size > MAX_ATTACH_TOTAL_BYTES");
    expect(src).not.toContain("Attachments must be ≤3MB each.");
    expect(src).toContain('"Up to 10 files, 25 MB total"');
  });
  it("surfaces the server's reason when a send fails", () => {
    expect(src).toContain("e?.details?.detail ?? e?.details?.error?.message");
  });
});
