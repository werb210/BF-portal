// LENDER_HEADER_WHITE_v2 / LENDER_COMPANY_PARITY_v1 / LENDER_PRODUCT_PARITY_v1 /
// LENDER_PRODUCT_NOTIF_DEEPLINK_v1 / STAFF_LENDER_WEB_DESC_v1
// White header on navy, full staff <-> lender-portal form parity (commission stays
// staff-only), plus the notification deep link.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(path.join(process.cwd(), "src", "pages", "lender", "LenderPortalPage.tsx"), "utf-8");
const lendersPage = readFileSync(path.join(process.cwd(), "src", "pages", "lenders", "LendersPage.tsx"), "utf-8");
const createModal = readFileSync(path.join(process.cwd(), "src", "pages", "lenders", "components", "CreateLenderModal.tsx"), "utf-8");

describe("lender portal header contrast", () => {
  it("group name, welcome line and logo are white", () => {
    expect(page).toContain('color: "#ffffff" }}>Boreal Financial Group');
    expect(page).toContain('color: "rgba(255,255,255,0.85)"');
    expect(page).toContain('filter: "brightness(0) invert(1)"');
  });
});

describe("company form parity", () => {
  it("lender portal shows and edits staff-form fields", () => {
    expect(page.split('{ key: "country", label: "Country" }').length - 1).toBe(2);
    expect(page.split('{ key: "application_url", label: "Application URL" }').length - 1).toBe(2);
    expect(page).toContain('{ key: "submission_method", label: "Submission method" }');
    expect(page).toContain('<option value="GOOGLE_SHEET">Google Sheet</option>');
  });

  it("staff create and edit forms include Website + Description", () => {
    expect(lendersPage).toContain("STAFF_LENDER_WEB_DESC_v1");
    expect(createModal).toContain('data-testid="lender-website"');
    expect(createModal).toContain('data-testid="lender-description"');
  });
});

describe("product form parity", () => {
  it("lender portal product form has Required Documents + Active and no commission", () => {
    expect(page).toContain("CORE UNDERWRITING PACK");
    expect(page).toContain("required_documents: requiredDocuments");
    expect(page).toContain("setProdActive(e.target.checked)");
    expect(page).toContain("showCommission={false}");
  });

  it("doc labels match canonical server list (en dash escapes)", () => {
    expect(page).toContain('PnL \\u2013 Interim financials');
    expect(page).toContain('Balance Sheet \\u2013 Interim financials');
  });
});

describe("notification deep link", () => {
  it("LendersPage opens the product editor from ?editProduct=", () => {
    expect(lendersPage).toContain("LENDER_PRODUCT_NOTIF_DEEPLINK_v1");
    expect(lendersPage).toContain('searchParams.get("editProduct")');
  });
});
