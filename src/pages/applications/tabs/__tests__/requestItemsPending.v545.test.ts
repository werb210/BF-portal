// BF_PORTAL_BLOCK_v545
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const src = readFileSync("src/pages/applications/tabs/RequestItemsTab.tsx", "utf-8");
describe("v545 Request from Client counts only what the client still owes", () => {
  it("excludes uploaded documents from the request", () => {
    expect(src).toContain("docItems.filter((it) => isChecked(it) && !isUploaded(it))");
  });
  it("defines the pending list after isUploaded exists", () => {
    expect(src.indexOf("const isUploaded")).toBeLessThan(src.indexOf("const checkedDocs"));
  });
});
