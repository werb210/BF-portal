// BF_PORTAL_SHARED_DOCS_v636
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const tab = readFileSync(path.join(process.cwd(), "src/pages/applications/tabs/RequestItemsTab.tsx"), "utf8");

describe("v636 shared documents on Request Items", () => {
  it("reads BF-Server's shared list and labels those items", () => {
    expect(tab).toContain("Array.isArray(r?.shared)");
    expect(tab).toContain('"Shared from " + from');
    expect(tab).toContain('{isUploaded(it) ? (sharedLabel(it) ?? "Uploaded") : "Missing"}');
  });
});
