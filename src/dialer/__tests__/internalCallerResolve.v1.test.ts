// BF_PORTAL_INTERNAL_CALLER_RESOLVE_v1
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(path.join(process.cwd(), "src/dialer/DialerProvider.tsx"), "utf8");

describe("incoming caller resolution", () => {
  it("does not skip resolution for a client-to-client invite", () => {
    expect(src).toContain('if (!/\\d{7,}/.test(rawPhone) && !rawPhone.startsWith("client:")) return;');
  });
  it("still labels a genuinely unmatched caller", () => {
    expect(src).toContain('"Unknown caller"');
  });
});
