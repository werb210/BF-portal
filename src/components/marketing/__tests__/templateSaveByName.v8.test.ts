// BF_PORTAL_TEMPLATE_SAVE_BY_NAME_v8
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "../BrandedEmailComposer.tsx"), "utf8");
const bi = fs.readFileSync(path.resolve(__dirname, "../../../silos/bi/marketing/BIMarketing.tsx"), "utf8");

describe("editing and re-saving a template", () => {
  it("prefills the name box when a template is picked", () => {
    expect(src).toContain('setLibName(t.name ?? "");');
  });
  it("no longer clears the name after saving", () => {
    expect(src).not.toContain('setLibName("");');
  });
  it("reports whether the save replaced an existing template", () => {
    expect(src).toContain("res?.data?.replaced ?? res?.replaced");
    expect(src).toContain('wasReplaced ? "updated" : "saved"');
  });
});

describe("BF_PORTAL_APOLLO_OFF_v10", () => {
  it("drops the Apollo tab entirely", () => {
    expect(bi).not.toContain('"apollo"');
    expect(bi).not.toContain("MarketingT");
  });
  it("opens on Email instead of a dead default tab", () => {
    expect(bi).toContain('useState<Channel>("email")');
  });
});
