// BF_PORTAL_VOICE_AUDIT_v687
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dialer header between calls", () => {
  it("does not show the last caller over a newly typed number, and forgets them on close", () => {
    const src = readFileSync("src/dialer/components/DialerPanel.tsx", "utf8");
    expect(src).toContain("const staleCtx = !liveAny && !incoming && typedDigits.length > 0 && typedDigits !== ctxDigits;");
    expect(src).toContain('const headline = staleCtx ? "New call"');
    expect(src).toContain("{!staleCtx && st.ctx.contactId && (");
    expect(src).toContain("if (!liveAny) st.setCtx({});");
  });
});
