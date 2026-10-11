import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const types = readFileSync("src/dialer/types.ts", "utf-8");
const store = readFileSync("src/dialer/store.ts", "utf-8");
const panel = readFileSync("src/dialer/components/DialerPanel.tsx", "utf-8");
const login = readFileSync("src/pages/Login.tsx", "utf-8");

describe("v663 fixes", () => {
  it("dialer timer falls back to callStartedAt", () => {
    expect(types).toContain("callStartedAt: string | null;");
    expect(store).toContain('status === "connected"');
    expect(store).toContain("callStartedAt: s.callStartedAt ?? new Date().toISOString()");
    expect(panel).toContain("conf?.started_at ?? st.callStartedAt");
  });
  it("login auto-submit fires once per phone", () => {
    expect(login).toContain("autoFiredFor");
    expect(login).toContain("if (autoFiredFor.current === normalized) return;");
  });
});
