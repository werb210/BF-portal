import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const types = readFileSync("src/dialer/types.ts", "utf-8");
const store = readFileSync("src/dialer/store.ts", "utf-8");
const panel = readFileSync("src/dialer/components/DialerPanel.tsx", "utf-8");
const login = readFileSync("src/pages/Login.tsx", "utf-8");
const conv  = readFileSync("src/pages/communications/ConversationViewer.tsx", "utf-8");
const task  = readFileSync("src/pages/tasks/TaskEditor.tsx", "utf-8");

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
  it("tasks fields have an explicit readable text color on a defined surface", () => {
    // BF_PORTAL_BLOCK_v_FIX_DIALER_V663_TASK_COLOR_TEST_v1 — PR #1785 tokenized the
    // dark-mode chrome; the hardcoded color: "#000" is now color: "var(--ui-text)"
    // on background var(--ui-surface-strong). Assert the tokenized intent (explicit
    // text color + surface), not the old literal hex.
    expect(task).toContain("taskFieldStyle");
    expect(task).toContain('color: "var(--ui-text)"');
    expect(task).toContain('background: "var(--ui-surface-strong)"');
  });
  it("conversation scroll keys on id + length via rAF", () => {
    expect(conv).toContain("requestAnimationFrame");
    expect(conv).toContain("conversation?.id, conversation?.messages.length");
  });
});
