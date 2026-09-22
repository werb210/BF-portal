// BF_PORTAL_BI_EMAIL_TEMPLATE_REQUIRED_v399
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "src/components/marketing/SequenceCanvas.tsx"), "utf8");

describe("BI email steps need a template", () => {
  it("the canvas flags a BI email step without a template", () => {
    expect(src).toContain('if (silo === "bi" && node.kind === "email") return node.templateId ? null : "Choose an email template";');
  });
  it("the typed-message box is hidden for BI email steps (it was never sent)", () => {
    expect(src).toContain('{!(silo === "bi" && selected.kind === "email") && <label className="text-sm">Message recipient reads');
  });
});
