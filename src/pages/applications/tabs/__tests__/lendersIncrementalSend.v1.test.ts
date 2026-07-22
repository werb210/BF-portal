// BF_PORTAL_INCREMENTAL_LENDER_SEND_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/pages/applications/tabs/LendersTab.tsx"),
  "utf8",
);

describe("lenders tab incremental send", () => {
  it("excludes already-sent lenders from the selection", () => {
    expect(src).toContain("const isAlreadySent");
    expect(src).toContain("m.id === s && !isAlreadySent(m)");
  });

  it("disables the checkbox for a lender that already received the package", () => {
    expect(src).toContain("disabled={sending || isStale || isAlreadySent(m)}");
  });

  it("surfaces the orchestrator reason instead of reporting silent success", () => {
    expect(src).toContain("describeSendResult");
    expect(src).toContain("stageB?.fired === true");
    expect(src).toContain("not_ready:");
    expect(src).toContain("already_sent:");
    expect(src).toContain("dispatch_in_progress:");
  });

  it("refreshes the sent-lenders marker after a real send", () => {
    expect(src).toContain('queryKey: ["sent-lenders", id]');
  });
});
