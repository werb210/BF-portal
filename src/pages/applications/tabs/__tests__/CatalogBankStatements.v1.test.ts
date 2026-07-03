// BF_PORTAL_CATALOG_BANK_STATEMENTS_v1 - banking statements must ALWAYS be
// requestable from the Request Items tab, not only when a lender product's
// Step-5 set includes it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "pages", "applications", "tabs", "RequestItemsTab.tsx"), "utf-8");
describe("request items catalog", () => {
  it("always lists 6 months business banking statements", () => {
    expect(src).toContain('"6 months business banking statements"');
  });
});
