// BF_PORTAL_SBA_DOC_PACK_v202
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "..", "LendersPage.tsx"), "utf-8");

// Byte-identical to the document_type values in BF-Server migrations v88/v99/v101
// and to the client's FORM_RENDERERS keys. A rename on either side breaks the
// join silently, so it is pinned on both.
// BF_PORTAL_SBA_PACK_TRIMMED_v206 - debt_schedule dropped from the SBA pack
// (the Debt Stack form collects it). Eight keys, matching the server triggers.
const SBA_KEYS = [
  "sba_form_413",
  "sba_form_1919",
  "owner_photo_id",
  "formation_documents",
  "personal_tax_returns",
  "business_plan",
  "sba_1919_attachments",
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
    // BF_PORTAL_SBA_DOCPACK_TEST_FIX_v205
    // This forbade the raw substring "business_plan_projections" anywhere in the
    // file - and the v202 comment above sbaTypes names that key precisely to
    // explain why the SBA keys are written out longhand. The test therefore
    // failed on the comment that documents it.
    //
    // The rule being protected is that no SBA entry is KEYED on the slugified
    // label, so assert on the key declaration rather than on prose. The comment
    // stays: it is the record of why these strings are not derived.
    const sbaTypesStart = src.indexOf("const sbaTypes");
    const sbaBlock = src.slice(sbaTypesStart, src.indexOf("const [form, setForm]", sbaTypesStart));
    expect(sbaBlock).not.toContain('key: "business_plan_projections"');
    expect(sbaBlock).toContain('key: "business_plan"');
  });

  it("no longer calls useDocumentTypes and discards the result", () => {
    expect(src).not.toContain("  useDocumentTypes();");
  });
});
