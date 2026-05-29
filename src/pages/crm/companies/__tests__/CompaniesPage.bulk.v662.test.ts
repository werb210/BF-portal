import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const page = readFileSync("src/pages/crm/companies/CompaniesPage.tsx", "utf-8");
const crm = readFileSync("src/api/crm.ts", "utf-8");
const nav = readFileSync("src/layouts/AppLayout.tsx", "utf-8");

describe("v662 BF CRM rename + company bulk select", () => {
  it("companies page has admin-gated row checkboxes and select-all", () => {
    expect(page).toContain('type="checkbox" checked={selected.has(r.id)}');
    expect(page).toContain("rows.every((c) => selected.has(c.id))");
  });
  it("companies page wires mass delete + tag", () => {
    expect(page).toContain("crmApi.bulkDeleteCompanies");
    expect(page).toContain("crmApi.bulkTagCompanies");
  });
  it("crmApi exposes company bulk endpoints", () => {
    expect(crm).toContain('/api/crm/companies/bulk-delete');
    expect(crm).toContain('/api/crm/companies/bulk-tag');
  });
  it("BF nav label renamed Contacts -> CRM (SLF untouched)", () => {
    const bf = nav.slice(nav.indexOf("const BF_NAV"), nav.indexOf("const BI_NAV"));
    expect(bf).toContain('{ label: "CRM",');
    expect(bf).not.toContain('{ label: "Contacts",');
  });
});
