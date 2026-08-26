// BF_PORTAL_SBA_DOC_PACK_v202
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "..", "LendersPage.tsx"), "utf-8");

// Byte-identical to the document_type values in BF-Server migrations v88/v99/v101
// and to the client's FORM_RENDERERS keys. A rename on either side breaks the
// join silently, so it is pinned on both.
const SBA_KEYS = [
  "sba_form_413",
  "sba_form_1919",
  "owner_photo_id",
  "formation_documents",
  "personal_tax_returns",
  "business_plan",
  "sba_1919_attachments",
  "debt_schedule",
  "lease_or_loi",
];

describe("SBA document pack", () => {
  it("carries every key the server attaches", () => {
    for (const k of SBA_KEYS) {
      expect(src).toContain(`key: "${k}"`);
    }
  });

  it("renders only for SBA products", () => {
    expect(src).toContain('form.category === "SBA_GOVERNMENT"');
  });

  it("does not slugify SBA keys from labels", () => {
    // business_plan_projections is what slugifying produces, and is the wrong key.
    expect(src).not.toContain("business_plan_projections");
  });

  it("no longer calls useDocumentTypes and discards the result", () => {
    expect(src).not.toContain("  useDocumentTypes();");
  });
});
