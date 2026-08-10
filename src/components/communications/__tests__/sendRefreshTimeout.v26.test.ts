// BF_PORTAL_SEND_REFRESH_TIMEOUT_v26
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/components/communications/O365ComposeModal.tsx"),
  "utf8",
);

describe("the silent token refresh cannot block a send", () => {
  it("races the refresh against a timeout", () => {
    expect(src).toContain("const REFRESH_TIMEOUT_MS = 8000;");
    expect(src).toContain("await Promise.race([");
    expect(src).toContain("new Promise((resolve) => setTimeout(resolve, REFRESH_TIMEOUT_MS))");
  });
  it("resolves the timeout rather than rejecting, so the send still runs", () => {
    // The file header mentions the endpoint too, so anchor on the actual call.
    const start = src.indexOf("REFRESH_TIMEOUT_MS = 8000");
    const block = src.slice(start, src.indexOf('await api("/api/o365/mail/send"', start));
    expect(block).toContain("(resolve) => setTimeout(resolve");
    expect(block).not.toContain("reject");
  });
  it("still issues the send after the race", () => {
    const refreshAt = src.indexOf("REFRESH_TIMEOUT_MS = 8000");
    const sendAt = src.indexOf('await api("/api/o365/mail/send"');
    expect(refreshAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(refreshAt);
  });
});

describe("the send button cannot be left stuck", () => {
  it("always clears the sending flag", () => {
    const fn = src.slice(src.indexOf("async function sendComposed"));
    expect(fn).toContain("finally {");
    expect(fn).toContain("setComposeSending(false);");
  });
  it("surfaces a failure instead of failing silently", () => {
    expect(src).toContain('setComposeError(e?.message ?? "Send failed.");');
  });
});
