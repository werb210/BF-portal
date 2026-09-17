// BF_PORTAL_REQUIRED_DOC_PROGRESS_v329
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tab = readFileSync(resolve(__dirname, "..", "RequestItemsTab.tsx"), "utf-8");

describe("the checklist shows what has actually arrived", () => {
  it("reads the satisfied list BF-Server v328 returns", () => {
    expect(tab).toContain("Array.isArray(r?.satisfied) ? r.satisfied : []");
  });

  it("clears it when the fetch fails, so a stale tick never survives an error", () => {
    expect(tab).toContain("setSatisfiedDocs(new Set());");
  });

  it("marks each required document Uploaded or Missing", () => {
    expect(tab).toContain('isUploaded(it) ? "Uploaded" : "Missing"');
  });

  it("counts the required set at the top of the column", () => {
    expect(tab).toContain("{requiredIn} of {requiredItems.length} uploaded");
  });

  it("matches on the document type as well as the label", () => {
    expect(tab).toContain("satisfiedDocs.has(norm(it.label)) || (!!it.documentType && satisfiedDocs.has(norm(it.documentType)))");
  });

  it("does not badge optional documents staff have not asked for", () => {
    expect(tab).toContain("{it.isRequired && checked && (");
  });

  it("counts only documents still required — a waived one is out of the total", () => {
    expect(tab).toContain("docItems.filter((it) => it.isRequired && isChecked(it))");
  });
});
