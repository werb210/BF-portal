import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const c = readFileSync("src/silos/bi/crm/contacts/BIContactsList.tsx", "utf-8");
const co = readFileSync("src/silos/bi/crm/companies/BICompaniesList.tsx", "utf-8");
const d = readFileSync("src/silos/bi/pipeline/tabs/DocumentsTab.tsx", "utf-8");
describe("v664 BI CRM bulk + admin delete", () => {
  it("contacts list has admin-gated checkboxes + bulk endpoints", () => {
    expect(c).toContain('type="checkbox" checked={selected.has(r.id)}');
    expect(c).toContain("/api/v1/bi/crm/contacts/bulk-delete");
    expect(c).toContain("/api/v1/bi/crm/contacts/bulk-tag");
  });
  it("companies list has admin-gated checkboxes + bulk endpoints", () => {
    expect(co).toContain('type="checkbox" checked={selected.has(r.id)}');
    expect(co).toContain("/api/v1/bi/crm/companies/bulk-delete");
    expect(co).toContain("/api/v1/bi/crm/companies/bulk-tag");
  });
  it("doc delete is admin-gated", () => {
    expect(d).toContain("isDocAdmin &&");
  });
});
