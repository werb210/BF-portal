// BF_PORTAL_LENDER_COMPANY_NAME_LOCKED_HINT_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const page = read("src/pages/lender/LenderPortalPage.tsx");
const shared = read("src/pages/lenders/components/lenderFieldShared.tsx");

describe("locked company name is explained, not just greyed out", () => {
  it("Field supports a neutral hint distinct from an error", () => {
    expect(shared).toContain("hint?: string");
    expect(shared).toContain("ui-field__hint");
    // A hint must not be styled as a failure.
    expect(shared).toContain('color: "var(--ui-text-muted)"');
  });

  it("an error still wins over a hint", () => {
    expect(shared).toContain("p.hint && !p.error");
  });

  it("the company name field tells the lender why it is locked", () => {
    expect(page).toContain('hint="Locked.');
    expect(page).toContain("maintained by Boreal");
    expect(page).toContain("info@boreal.financial");
  });

  it("the field stays visible so the lender can confirm the company", () => {
    // Hiding it would leave the lender unsure which record they are editing.
    expect(page).toContain('<Field label="Company name"');
    expect(page).toContain("profileDraft.name");
  });

  it("keeps the field genuinely non-editable", () => {
    expect(page).toContain('aria-readonly="true"');
    expect(page).toContain('cursor: "not-allowed"');
  });
});
