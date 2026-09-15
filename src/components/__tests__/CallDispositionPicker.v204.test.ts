// BF_PORTAL_CALL_DISPOSITION_v204
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const picker = readFileSync("src/components/CallDispositionPicker.tsx", "utf-8");
const service = readFileSync("src/services/callService.ts", "utf-8");
const tab = readFileSync("src/components/CallHistoryTab.tsx", "utf-8");

describe("disposition picker", () => {
  it("offers exactly the nine outcomes the server accepts", () => {
    const values = [...picker.matchAll(/value: "([a-z_]+)"/g)].map((m) => m[1]);
    expect(new Set(values)).toEqual(new Set([
      "connected", "left_voicemail", "no_answer", "follow_up",
      "documents_promised", "demo_booked", "needs_lender_review",
      "not_interested", "do_not_contact",
    ]));
  });
  it("only promises a task for the four outcomes that create one", () => {
    const creating = [...picker.matchAll(/value: "([a-z_]+)"[^}]*creates:/g)].map((m) => m[1]);
    expect(new Set(creating)).toEqual(new Set(["follow_up", "documents_promised", "demo_booked", "needs_lender_review"]));
  });
  it("creates no task or note itself - the server owns those side effects", () => {
    expect(picker).not.toMatch(/crm_notes|\/tasks|createTask/);
    expect(picker.match(/api\.post/g)?.length).toBe(1);
  });
  it("reports what the server actually did", () => {
    expect(picker).toContain("followUpCreated");
    expect(picker).toContain("Saved — follow-up task created");
  });
  it("surfaces the server's own error reason", () => { expect(picker).toMatch(/e\?\.response\?\.data\?\.error/); });
  it("reverts the selection when the save fails", () => { expect(picker).toContain("setValue(current ?? \"\")"); });
});
describe("wiring", () => {
  it("carries the disposition through the mapper", () => {
    expect(service).toContain("disposition: c.disposition ?? null");
    expect(service).toContain("disposition?: string | null;");
  });
  it("is mounted on the call history tab", () => {
    expect(tab).toContain("BF_PORTAL_CALL_DISPOSITION_v204");
    expect(tab).toContain("<CallDispositionPicker");
  });
});
