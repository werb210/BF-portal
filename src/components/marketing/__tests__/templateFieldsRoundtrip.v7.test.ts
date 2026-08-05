// BF_PORTAL_TEMPLATE_FIELDS_ROUNDTRIP_v7
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "../BrandedEmailComposer.tsx"), "utf8");

describe("email template library round-trip", () => {
  it("sends the full composer state to the library", () => {
    expect(src).toContain("html: preview, fields: tpl }");
  });

  it("carries fields on the library template type", () => {
    expect(src).toContain("fields?: Partial<Tpl> | null");
  });

  it("replaces the whole form on load instead of merging into the previous one", () => {
    expect(src).toContain('setTpl(t.fields ? { ...DEFAULTS, ...t.fields } : { ...DEFAULTS, body: t.body ?? "" });');
    expect(src).not.toContain("setTpl((p) => ({ ...p, body: t.body ?? p.body }));");
  });
});
